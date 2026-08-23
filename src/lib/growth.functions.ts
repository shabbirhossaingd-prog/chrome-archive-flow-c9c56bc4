import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { userId: string; supabase: any }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .limit(1);
  if (error) throw error;
  if (!data?.length) throw new Error("Forbidden");
}

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from || !to) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  return true;
}

async function sendWebhook(payload: Record<string, unknown>) {
  const url = process.env.NOTIFICATION_WEBHOOK_URL;
  if (!url) return false;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Notification webhook returned ${response.status}`);
  return true;
}

const eventCopy = (event: any) => {
  const type = String(event.event_type || "order_update");
  const status = String(event.payload?.status || "").replace(/_/g, " ");
  const product = String(event.payload?.product_name || "your object");
  const number = String(event.order_number || "");
  const title = type === "order_received" ? `Order ${number} received` : `Order ${number} update`;
  const line = type === "order_received"
    ? `We received your order for ${product}.`
    : `Your order status is now ${status || type.replace(/_/g, " ")}.`;
  return {
    subject: `ZZERKOFF — ${title}`,
    html: `<div style="font-family:Arial,sans-serif;background:#080808;color:#f5f5f5;padding:32px"><h2>${title}</h2><p>${line}</p><p>Track your order at <a style="color:#ddd" href="https://zzerkoff.vercel.app/track-order">ZZERKOFF Track Order</a>.</p></div>`,
  };
};

export const dispatchGrowthNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    let sent = 0;
    let failed = 0;

    const { data: events, error } = await context.supabase
      .from("commerce_notification_events")
      .select("*")
      .eq("delivery_status", "queued")
      .order("created_at", { ascending: true })
      .limit(30);
    if (error) throw error;

    for (const event of events ?? []) {
      let delivered = false;
      let attempted = false;
      try {
        const copy = eventCopy(event);
        if (event.email && process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
          attempted = true;
          delivered = (await sendEmail(event.email, copy.subject, copy.html)) || delivered;
        }
        if (process.env.NOTIFICATION_WEBHOOK_URL) {
          attempted = true;
          delivered = (await sendWebhook({ kind: "order", ...event })) || delivered;
        }
        if (delivered) {
          await context.supabase.from("commerce_notification_events").update({ delivery_status: "sent" }).eq("id", event.id);
          sent += 1;
        } else if (attempted) {
          await context.supabase.from("commerce_notification_events").update({ delivery_status: "failed" }).eq("id", event.id);
          failed += 1;
        }
      } catch (err) {
        console.error("[notifications] order event failed", err);
        await context.supabase.from("commerce_notification_events").update({ delivery_status: "failed" }).eq("id", event.id);
        failed += 1;
      }
    }

    try {
      const { data: alerts } = await context.supabase
        .from("restock_alerts")
        .select("id,email,phone,product_id,products(name,slug,quantity_available,stock_status)")
        .is("notified_at", null)
        .limit(30);

      for (const alert of alerts ?? []) {
        const product = Array.isArray(alert.products) ? alert.products[0] : alert.products;
        if (!product || Number(product.quantity_available || 0) <= 0 || product.stock_status === "SOLD OUT") continue;
        let delivered = false;
        try {
          const productUrl = `https://zzerkoff.vercel.app/product/${product.slug}`;
          if (alert.email && process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
            delivered = (await sendEmail(
              alert.email,
              `ZZERKOFF — ${product.name} is back`,
              `<div style="font-family:Arial,sans-serif;background:#080808;color:#f5f5f5;padding:32px"><h2>${product.name} is back.</h2><p>Your restock signal is active.</p><p><a style="color:#ddd" href="${productUrl}">View object</a></p></div>`,
            )) || delivered;
          }
          if (process.env.NOTIFICATION_WEBHOOK_URL) {
            delivered = (await sendWebhook({ kind: "restock", alert, product })) || delivered;
          }
          if (delivered) {
            await context.supabase.from("restock_alerts").update({ notified_at: new Date().toISOString() }).eq("id", alert.id);
            sent += 1;
          }
        } catch (err) {
          console.error("[notifications] restock failed", err);
          failed += 1;
        }
      }
    } catch (err) {
      console.warn("[notifications] restock table unavailable", err);
    }

    return { sent, failed };
  });
