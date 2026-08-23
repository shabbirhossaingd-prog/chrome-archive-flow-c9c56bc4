import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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

const blogGeneratorInput = z.object({
  count: z.number().int().min(1).max(4).default(3),
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

export const generateAiBlogDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => blogGeneratorInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server.");

    const { data: existing, error: existingError } = await context.supabase
      .from("blog_posts")
      .select("title,slug")
      .order("created_at", { ascending: false })
      .limit(100);
    if (existingError) throw existingError;

    const existingTitles = (existing ?? []).map((row: any) => row.title).join("\n");
    const prompt = `You are the editorial and SEO writer for ZZERKOFF, a unisex alternative accessories brand focused on chrome, vintage, gothic, underground and Y2K styling.\n\nCreate ${data.count} genuinely useful, non-duplicate blog articles. Avoid invented product facts, medical claims, fake statistics and fake trends. Focus on styling, sizing, care, accessory coordination, buying decisions, or subculture-inspired fashion education.\n\nDo not reuse or closely imitate these existing titles:\n${existingTitles || "None yet"}\n\nFor each article return: title, slug, excerpt (max 180 chars), seo_title (max 60 chars), seo_description (145-160 chars), and content_html. content_html must be clean semantic HTML using only h2, h3, p, ul, ol, li, strong, em and blockquote. Aim for 700-1100 useful words. Do not include an h1.`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                articles: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      slug: { type: "string" },
                      excerpt: { type: "string" },
                      seo_title: { type: "string" },
                      seo_description: { type: "string" },
                      content_html: { type: "string" },
                    },
                    required: ["title", "slug", "excerpt", "seo_title", "seo_description", "content_html"],
                  },
                },
              },
              required: ["articles"],
            },
          },
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) throw new Error("Gemini free quota is temporarily exhausted.");
      throw new Error(`Gemini generation failed (${response.status}).`);
    }

    const body = (await response.json()) as any;
    const raw = body?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text ?? "").join("") ?? "";
    if (!raw) throw new Error("Gemini returned an empty response.");

    const parsed = JSON.parse(raw);
    const articles = Array.isArray(parsed?.articles) ? parsed.articles.slice(0, data.count) : [];
    const created: Array<{ title: string; slug: string }> = [];
    const usedSlugs = new Set((existing ?? []).map((row: any) => String(row.slug)));

    for (const article of articles) {
      const title = String(article.title || "").trim().slice(0, 180);
      const baseSlug = slugify(String(article.slug || title));
      if (!title || !baseSlug) continue;

      let slug = baseSlug;
      let suffix = 2;
      while (usedSlugs.has(slug)) slug = `${baseSlug}-${suffix++}`;
      usedSlugs.add(slug);

      const { error } = await context.supabase.from("blog_posts").insert({
        title,
        slug,
        excerpt: String(article.excerpt || "").trim().slice(0, 220),
        content: String(article.content_html || "").trim().slice(0, 30000),
        seo_title: String(article.seo_title || title).trim().slice(0, 70),
        seo_description: String(article.seo_description || "").trim().slice(0, 180),
        status: "draft",
        published_at: null,
        featured: false,
      });
      if (error) throw error;
      created.push({ title, slug });
    }

    return { created };
  });
