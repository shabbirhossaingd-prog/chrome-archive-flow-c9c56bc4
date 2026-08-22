import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Search } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { LiquidChrome } from "@/components/site/LiquidChrome";
import { Reveal } from "@/components/site/Reveal";
import { supabase } from "@/integrations/supabase/client";
import { useSite } from "@/lib/settings";
import { getPublicSteadfastStatus } from "@/lib/steadfast.functions";

export const Route = createFileRoute("/track-order")({
  head: () => ({
    meta: [
      { title: "Track Order — ZZERKOFF" },
      { name: "description", content: "Track a ZZERKOFF order using the order number and checkout phone number." },
      { property: "og:title", content: "Track Order — ZZERKOFF" },
    ],
    links: [{ rel: "canonical", href: "https://zzerkoff.vercel.app/track-order" }],
  }),
  component: TrackOrderPage,
});

type RecentOrder = {
  orderNumber: string;
  phone: string;
  createdAt: string;
};

type TrackedOrder = {
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  product_name: string;
  product_code: string;
  quantity: number;
  selected_size: string | null;
  selected_finish: string | null;
  selected_color: string | null;
  subtotal_price: number | string | null;
  discount_amount: number | string;
  promo_code: string | null;
  total_price: number | string;
  created_at: string;
  confirmed_at: string | null;
  processing_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
};

const STATUS_ORDER = ["new", "confirmed", "processing", "shipped", "delivered"];

function TrackOrderPage() {
  const site = useSite();
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [copiedOrder, setCopiedOrder] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rows = JSON.parse(
        window.localStorage.getItem("zzerkoff:recent-orders:v1") || "[]",
      ) as RecentOrder[];
      setRecentOrders(Array.isArray(rows) ? rows.slice(0, 8) : []);
    } catch {
      setRecentOrders([]);
    }

    const params = new URLSearchParams(window.location.search);
    const orderParam = params.get("order") || "";
    const phoneParam = params.get("phone") || "";
    if (orderParam) setOrderNumber(orderParam);
    if (phoneParam) setPhone(phoneParam);
  }, []);

  const track = async (orderOverride?: string, phoneOverride?: string) => {
    setError("");
    setOrder(null);

    const nextOrderNumber = (orderOverride ?? orderNumber).trim();
    const nextPhone = (phoneOverride ?? phone).trim();

    if (orderOverride) setOrderNumber(nextOrderNumber);
    if (phoneOverride) setPhone(nextPhone);

    if (nextOrderNumber.length < 6 || nextPhone.replace(/\D/g, "").length < 7) {
      setError("Enter your order number and the same phone number used at checkout.");
      return;
    }

    setLoading(true);
    const { data, error: rpcError } = await (supabase as any).rpc("track_public_order", {
      p_order_number: nextOrderNumber,
      p_phone: nextPhone,
    });
    setLoading(false);

    if (rpcError) {
      setError("Could not check the order right now. Please try again.");
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result) {
      setError("No matching order found. Check the order number and phone number.");
      return;
    }

    let tracked = result as TrackedOrder;

    try {
      const courier = await getPublicSteadfastStatus({
        data: {          orderNumber: nextOrderNumber,
phone: nextPhone,
        },
      });

      if (courier?.publicStatus) {
        tracked = { ...tracked, status: courier.publicStatus };
      }
    } catch {
      // Fall back to website order status if the courier API is unavailable.
    }

    setOrder(tracked);
  };

  const selected = order
    ? [order.selected_color, order.selected_size, order.selected_finish]
        .filter(Boolean)
        .join(" / ")
    : "";

  const currentIndex = order ? STATUS_ORDER.indexOf(order.status) : -1;

  const timeline = order
    ? [
        ["PLACED", order.created_at],
        ["CONFIRMED", order.confirmed_at],
        ["PROCESSING", order.processing_at],
        ["SHIPPED", order.shipped_at],
        ["DELIVERED", order.delivered_at],
        ["CANCELLED", order.cancelled_at],
      ].filter(([, time]) => Boolean(time))
    : [];

  return (
    <PageShell>
      <main className="relative isolate mx-auto min-h-[75vh] max-w-4xl px-5 pb-28 pt-32 sm:px-8 sm:pt-40">
        <LiquidChrome className="-left-40 top-10 h-[36rem] w-[36rem]" opacity={0.14} />

        <Reveal>
          <span className="text-[9px] uppercase tracking-[0.45em] text-muted-foreground">
            ZZ / ORDER STATUS
          </span>
          <h1 className="mt-5 font-display text-2xl tracking-[0.18em] text-foreground sm:text-4xl">
            TRACK ORDER
          </h1>
          <p className="mt-6 max-w-2xl font-editorial text-lg leading-relaxed text-muted-foreground">
            Enter the order ID received after checkout and the same phone number used for the order.
          </p>
        </Reveal>        {recentOrders.length > 0 && (
<Reveal delay={80}>
  <section className="glass-panel mt-10 rounded-[28px] p-5 sm:p-7">
    <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
      RECENT ORDERS ON THIS DEVICE
    </span>
    <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
      Recent order IDs are saved only in this browser so you can recover and track them.
    </p>

    <div className="mt-5 space-y-2">
      {recentOrders.map((recent) => (
        <article
          key={recent.orderNumber}
          className="flex flex-wrap items-center gap-3 rounded-[20px] border border-border/50 p-4"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-[0.24em] text-foreground">
              {recent.orderNumber}
            </p>
            <p className="mt-2 text-[8px] text-muted-foreground">
              {new Date(recent.createdAt).toLocaleDateString("en-GB", {
                dateStyle: "medium",
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(recent.orderNumber);
                setCopiedOrder(recent.orderNumber);
              } catch {
                setCopiedOrder("");
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-border/55 px-3 py-3 text-[8px] uppercase tracking-[0.2em] text-muted-foreground"
          >
            <Copy className="size-3" />
            {copiedOrder === recent.orderNumber ? "Copied" : "Copy ID"}
          </button>
          <button
            type="button"
            onClick={() => void track(recent.orderNumber, recent.phone)}
            className="rounded-xl border border-chrome/45 px-4 py-3 text-[8px] uppercase tracking-[0.2em] text-foreground"
          >
            Track
          </button>
        </article>
      ))}
    </div>
  </section>
</Reveal>
        )}

        <Reveal delay={100}>
<div className="glass-panel mt-10 rounded-[28px] p-5 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-[8px] uppercase tracking-[0.35em] text-muted-foreground">Order ID</label>
                <input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="ZZ-260816-0001"
                  className="w-full rounded-2xl border border-border/70 bg-white/[0.02] px-4 py-4 text-xs tracking-[0.08em] text-foreground outline-none placeholder:text-muted-foreground/55 focus:border-chrome/70"
                />
              </div>
              <div>
                <label className="mb-2 block text-[8px] uppercase tracking-[0.35em] text-muted-foreground">Phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full rounded-2xl border border-border/70 bg-white/[0.02] px-4 py-4 text-xs tracking-[0.08em] text-foreground outline-none placeholder:text-muted-foreground/55 focus:border-chrome/70"
                />
              </div>
            </div>
            <button
              type="button"              onClick={() => void track()}
    disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-3 rounded-full border border-chrome/50 bg-white/[0.04] px-8 py-5 text-[10px] uppercase tracking-[0.42em] text-foreground transition-all hover:border-chrome hover:bg-white/[0.08] disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              {loading ? "Checking" : "Track order"}
            </button>
            {error && (
              <p className="mt-5 rounded-2xl border border-border/60 bg-white/[0.02] px-4 py-3 text-[10px] leading-relaxed tracking-[0.08em] text-muted-foreground">
                {error}
              </p>
            )}
          </div>
        </Reveal>

        {order && (
          <Reveal delay={120}>
            <section className="glass-panel mt-6 rounded-[28px] p-5 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-5 border-b border-border/50 pb-6">
                <div>
                  <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">{order.order_number}</span>
                  <h2 className="mt-3 font-display text-lg tracking-[0.15em] text-foreground">{order.product_name}</h2>
                  <p className="mt-2 text-[9px] uppercase tracking-[0.26em] text-muted-foreground">
                    {order.product_code}{selected ? ` · ${selected}` : ""}{` · QTY ${order.quantity}`}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded-xl border border-chrome/50 px-3 py-2 text-[8px] uppercase tracking-[0.25em] text-chrome">{order.status}</span>
                  {Number(order.discount_amount || 0) > 0 && order.subtotal_price != null && (
                    <p className="mt-4 text-[9px] tracking-[0.12em] text-muted-foreground line-through">
                      {site.currencySymbol}{Number(order.subtotal_price).toLocaleString("en-US")}
                    </p>
                  )}
                  <p className="mt-2 text-xs tracking-[0.15em] text-foreground">
                    {site.currencySymbol}{Number(order.total_price).toLocaleString("en-US")}
                  </p>
                  {order.promo_code && (
                    <p className="mt-2 text-[8px] uppercase tracking-[0.22em] text-chrome">
                      Promo {order.promo_code}
                    </p>
                  )}
                </div>
              </div>

              {order.status !== "cancelled" && (
                <div className="mt-6 grid grid-cols-5 gap-2">
                  {STATUS_ORDER.map((status, index) => {
                    const active = index <= currentIndex;
                    return (
                      <div key={status} className="min-w-0 text-center">
                        <div className={`mx-auto grid size-7 place-items-center rounded-full border ${active ? "border-chrome/70 bg-white/[0.07] text-foreground" : "border-border/50 text-muted-foreground"}`}>
                          {active ? <Check className="size-3" /> : <span className="text-[8px]">{index + 1}</span>}
                        </div>
                        <span className="mt-2 block truncate text-[7px] uppercase tracking-[0.12em] text-muted-foreground sm:text-[8px]">{status}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 border-t border-border/50 pt-5">
                <span className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">Payment</span>
                <p className="mt-3 text-[9px] uppercase tracking-[0.24em] text-foreground">
                  {order.payment_method} · {order.payment_status}
                </p>
              </div>

              {timeline.length > 0 && (
                <div className="mt-6 border-t border-border/50 pt-5">
                  <span className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">Timeline</span>
                  <div className="mt-4 space-y-3">
                    {timeline.map(([label, time]) => (
                      <div key={String(label)} className="flex items-center justify-between gap-4 border-b border-border/30 pb-3">
                        <span className="text-[8px] uppercase tracking-[0.24em] text-foreground">{label}</span>
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(String(time)).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </Reveal>
        )}
      </main>
    </PageShell>
  );
}
