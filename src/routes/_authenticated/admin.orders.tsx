import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowUpRight, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSite } from "@/lib/settings";
import { toast } from "sonner";
import {
  createSteadfastShipment,
  syncSteadfastShipment,
} from "@/lib/steadfast.functions";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrders,
});

const STATUSES = [
  "pre_order",
  "new",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

type OrderStatus = (typeof STATUSES)[number];

type Order = {
  id: string;
  order_number: string;
  source: string;
  status: OrderStatus;
  customer_name: string;
  phone: string;
  delivery_address: string;
  map_url: string | null;
  customer_note: string | null;
  product_name: string;
  product_code: string;
  unit_price: number | string;
  quantity: number;
  selected_size: string | null;
  selected_finish: string | null;
  selected_color: string | null;
  subtotal_price: number | string | null;
  discount_amount: number | string;
  promo_code: string | null;
  customer_email: string | null;
  total_price: number | string;
  admin_note: string;
  payment_method: "cod" | "bkash" | "nagad";
  payment_status: "unpaid" | "pending_verification" | "paid" | "rejected" | "refunded";
  transaction_id: string | null;
  confirmed_at: string | null;
  processing_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  steadfast_state: "not_sent" | "creating" | "connected" | "error" | "test";
  steadfast_consignment_id: number | null;
  steadfast_tracking_code: string | null;
  steadfast_status: string | null;
  steadfast_connected_at: string | null;
  steadfast_synced_at: string | null;
  steadfast_last_error: string | null;
  created_at: string;
  updated_at: string;
};

function displayStatus(status: string) {
  return status.replace(/_/g, "-");
}

function isPreorderOrder(order: Order) {
  const source = String(order.source || "").toLowerCase();
  return order.status === "pre_order" || source.includes("preorder") || source.includes("pre-order");
}

function AdminOrders() {
  const site = useSite();
  const queryClient = useQueryClient();
  const steadfastTestMode = (site.settings as any)?.steadfast_test_mode ?? true;
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [search, setSearch] = useState("");

  const getAccessToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Your admin session expired. Please sign in again.");
    }

    return session.access_token;
  };

  const ordersQuery = useQuery({
    queryKey: ["admin-orders"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await (supabase as any)
        .from("orders")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      if (status === "confirmed") {
        if (steadfastTestMode) {
          const { error: testError } = await (supabase as any)
            .from("orders")
            .update({
              steadfast_state: "test",
              steadfast_status: "test_mode",
              steadfast_connected_at: new Date().toISOString(),
              steadfast_synced_at: new Date().toISOString(),
              steadfast_last_error: null,
            })
            .eq("id", id)
            .neq("steadfast_state", "connected");

          if (testError) throw testError;
          return { courierCreated: false, testMode: true };
        }

        const accessToken = await getAccessToken();
        try {
          const courier = await createSteadfastShipment({
            data: { orderId: id, accessToken },
          });
          return { courierCreated: true, testMode: false, courier };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Steadfast connection failed.";
          throw new Error(`Order confirmed. Steadfast: ${message}`);
        }
      }

      return { courierCreated: false, testMode: false };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      if (result?.testMode) {
        toast.success("Test Mode: order confirmed. Nothing was sent to Steadfast.");
      } else if (result?.courierCreated) {
        toast.success("Order confirmed and sent to Steadfast.");
      } else {
        toast.success("Order updated.");
      }
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.error(error instanceof Error ? error.message : "Could not update order.");
    },
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, payment_status }: { id: string; payment_status: Order["payment_status"] }) => {
      const { error } = await (supabase as any).from("orders").update({ payment_status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  const connectSteadfast = useMutation({
    mutationFn: async (id: string) => {
      if (steadfastTestMode) {
        const { error } = await (supabase as any)
          .from("orders")
          .update({
            steadfast_state: "test",
            steadfast_status: "test_mode",
            steadfast_connected_at: new Date().toISOString(),
            steadfast_synced_at: new Date().toISOString(),
            steadfast_last_error: null,
          })
          .eq("id", id)
          .neq("steadfast_state", "connected");

        if (error) throw error;
        return { testMode: true };
      }

      const accessToken = await getAccessToken();
      return createSteadfastShipment({
        data: { orderId: id, accessToken },
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success(
        (result as any)?.testMode
          ? "Test Mode: simulated courier connection only."
          : "Steadfast parcel connected.",
      );
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.error(error instanceof Error ? error.message : "Steadfast connection failed.");
    },
  });

  const syncSteadfast = useMutation({
    mutationFn: async (id: string) => {
      if (steadfastTestMode) return { testMode: true };
      const accessToken = await getAccessToken();
      return syncSteadfastShipment({
        data: { orderId: id, accessToken },
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success(
        (result as any)?.testMode
          ? "Test Mode: no real courier status was requested."
          : "Steadfast status synced.",
      );
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.error(error instanceof Error ? error.message : "Could not sync Steadfast.");
    },
  });

  const deleteCancelledOrder = useMutation({
    mutationFn: async (order: Order) => {
      if (order.status !== "cancelled") {
        throw new Error("Only cancelled orders can be deleted.");
      }
      if (
        order.steadfast_state === "connected" ||
        order.steadfast_consignment_id ||
        order.steadfast_tracking_code
      ) {
        throw new Error(
          "This order is connected to a real Steadfast parcel, so it is kept for courier/audit safety.",
        );
      }

      const { error } = await (supabase as any)
        .from("orders")
        .delete()
        .eq("id", order.id)
        .eq("status", "cancelled");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Cancelled test order permanently deleted.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete order.");
    },
  });

  const orders = ordersQuery.data ?? [];
  const preOrderCount = orders.filter((o) => o.status === "pre_order" || isPreorderOrder(o)).length;
  const newCount = orders.filter((o) => o.status === "new").length;
  const confirmedCount = orders.filter((o) => o.status === "confirmed").length;
  const processingCount = orders.filter((o) => o.status === "processing").length;
  const shippedCount = orders.filter((o) => o.status === "shipped").length;
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const cancelledCount = orders.filter((o) => o.status === "cancelled").length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (!q) return true;
      return [
        o.order_number,
        o.customer_name,
        o.phone,
        o.product_name,
        o.product_code,
        o.delivery_address,
        o.source,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [orders, filter, search]);

  return (
    <div className="space-y-7 pb-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-[0.45em] text-muted-foreground">
            ZZERKOFF / STUDIO
          </span>
          <h1 className="mt-4 font-display text-xl tracking-[0.22em] text-foreground sm:text-2xl">
            ORDERS
          </h1>
          <p className="mt-3 text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
            {orders.length} total · {preOrderCount} pre-order · {newCount} new
          </p>
        </div>

        <button
          type="button"
          onClick={() => ordersQuery.refetch()}
          className="flex items-center gap-2 rounded-xl border border-border/60 px-4 py-3 text-[9px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <RefreshCw className={`size-3.5 ${ordersQuery.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="glass-panel rounded-[20px] border border-border/60 p-4">
        <span className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground">
          Steadfast mode
        </span>
        <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-chrome">
          {steadfastTestMode
            ? "TEST MODE — CONFIRM WILL NOT SEND A REAL PARCEL"
            : "LIVE MODE — CONFIRM CAN CREATE A REAL STEADFAST PARCEL"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {[
          ["PRE-ORDER", preOrderCount],
          ["NEW", newCount],
          ["CONFIRMED", confirmedCount],
          ["PROCESSING", processingCount],
          ["SHIPPED", shippedCount],
          ["DELIVERED", deliveredCount],
          ["CANCELLED", cancelledCount],
        ].map(([label, value]) => (
          <div key={String(label)} className="glass-panel rounded-[20px] p-4">
            <span className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground">{label}</span>
            <p className="mt-2 font-display text-xl tracking-[0.14em] text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-[24px] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order / customer / phone..."
            className="min-w-0 flex-1 rounded-xl border border-border/60 bg-white/[0.02] px-4 py-3 text-[10px] tracking-[0.08em] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-chrome/60"
          />

          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {(["all", ...STATUSES] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={`shrink-0 rounded-xl border px-3 py-3 text-[8px] uppercase tracking-[0.25em] transition-colors ${
                  filter === status
                    ? "border-chrome/60 bg-white/[0.06] text-foreground"
                    : "border-border/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {status === "all" ? "ALL" : displayStatus(status)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {ordersQuery.isLoading ? (
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Loading orders…
        </p>
      ) : ordersQuery.error ? (
        <div className="glass-panel rounded-[24px] p-6">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Could not load orders. Make sure the latest order SQL migration is applied in Supabase.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="glass-panel rounded-[24px] p-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            No orders found
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((order) => {
            const selected = [
              order.selected_color,
              order.selected_size,
              order.selected_finish,
            ]
              .filter(Boolean)
              .join(" / ");
            const timeline = [
              [isPreorderOrder(order) ? "PRE-ORDER" : "PLACED", order.created_at],
              ["CONFIRMED", order.confirmed_at],
              ["PROCESSING", order.processing_at],
              ["SHIPPED", order.shipped_at],
              ["DELIVERED", order.delivered_at],
              ["CANCELLED", order.cancelled_at],
            ].filter(([, time]) => Boolean(time));

            return (
              <article key={order.id} className="glass-panel rounded-[24px] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/50 pb-5">
                  <div>
                    <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
                      {new Date(order.created_at).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                    <h2 className="mt-3 font-display text-base tracking-[0.16em] text-foreground">
                      {order.order_number}
                    </h2>
                    <p className="mt-2 text-[8px] uppercase tracking-[0.28em] text-chrome">
                      {order.source || "website"}
                    </p>
                  </div>

                  <div className="flex max-w-xl flex-wrap justify-end gap-2">
                    {STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => updateStatus.mutate({ id: order.id, status })}
                        disabled={updateStatus.isPending}
                        className={`rounded-xl border px-3 py-3 text-[8px] uppercase tracking-[0.22em] transition-colors ${
                          order.status === status
                            ? "border-chrome/70 bg-white/[0.07] text-foreground"
                            : "border-border/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {displayStatus(status)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-6 lg:grid-cols-3">
                  <div>
                    <span className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">
                      Customer
                    </span>
                    <p className="mt-3 text-xs tracking-[0.08em] text-foreground">
                      {order.customer_name}
                    </p>
                    <a
                      href={`tel:${order.phone}`}
                      className="mt-2 block text-xs tracking-[0.08em] text-chrome hover:text-foreground"
                    >
                      {order.phone}
                    </a>
                    {order.customer_email && (
                      <a
                        href={`mailto:${order.customer_email}`}
                        className="mt-2 block break-all text-[9px] tracking-[0.06em] text-muted-foreground hover:text-foreground"
                      >
                        {order.customer_email}
                      </a>
                    )}
                  </div>

                  <div>
                    <span className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">
                      Object
                    </span>
                    <p className="mt-3 font-display text-sm tracking-[0.12em] text-foreground">
                      {order.product_name}
                    </p>
                    <p className="mt-2 text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                      {order.product_code}
                      {selected ? ` · ${selected}` : ""}
                      {` · QTY ${order.quantity}`}
                    </p>
                    <p className="mt-3 text-xs tracking-[0.15em] text-chrome">
                      {site.currencySymbol}
                      {Number(order.total_price).toLocaleString("en-US")}
                    </p>
                    {Number(order.discount_amount || 0) > 0 && (
                      <p className="mt-2 text-[8px] uppercase tracking-[0.22em] text-muted-foreground">
                        {order.promo_code ? `Promo ${order.promo_code} · ` : ""}
                        Discount −{site.currencySymbol}
                        {Number(order.discount_amount).toLocaleString("en-US")}
                        {order.subtotal_price != null
                          ? ` · Subtotal ${site.currencySymbol}${Number(order.subtotal_price).toLocaleString("en-US")}`
                          : ""}
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">
                      Delivery
                    </span>
                    <p className="mt-3 whitespace-pre-line text-xs leading-relaxed tracking-[0.06em] text-muted-foreground">
                      {order.delivery_address}
                    </p>
                    {order.map_url && (
                      <a
                        href={order.map_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.25em] text-chrome hover:text-foreground"
                      >
                        Open map
                        <ArrowUpRight className="size-3" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-5 border-t border-border/50 pt-5">
                  <span className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">Payment</span>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="rounded-xl border border-border/60 px-3 py-2 text-[8px] uppercase tracking-[0.22em] text-foreground">{order.payment_method}</span>
                    <span className="rounded-xl border border-chrome/40 px-3 py-2 text-[8px] uppercase tracking-[0.22em] text-chrome">{order.payment_status}</span>
                    {order.transaction_id && <span className="text-[9px] tracking-[0.12em] text-muted-foreground">TrxID: {order.transaction_id}</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.payment_status !== "paid" && (
                      <button
                        type="button"
                        onClick={() => updatePayment.mutate({ id: order.id, payment_status: "paid" })}
                        disabled={updatePayment.isPending}
                        className="rounded-xl border border-chrome/60 px-3 py-3 text-[8px] uppercase tracking-[0.22em] text-foreground"
                      >
                        Mark paid
                      </button>
                    )}
                    {order.payment_method !== "cod" && order.payment_status !== "rejected" && (
                      <button
                        type="button"
                        onClick={() => updatePayment.mutate({ id: order.id, payment_status: "rejected" })}
                        disabled={updatePayment.isPending}
                        className="rounded-xl border border-border/60 px-3 py-3 text-[8px] uppercase tracking-[0.22em] text-muted-foreground"
                      >
                        Reject payment
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 border-t border-border/50 pt-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <span className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">
                        Courier / Steadfast
                      </span>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`rounded-xl border px-3 py-2 text-[8px] uppercase tracking-[0.22em] ${
                          order.steadfast_state === "connected" || order.steadfast_state === "test"
                            ? "border-chrome/50 text-chrome"
                            : "border-border/50 text-muted-foreground"
                        }`}>
                          {order.steadfast_state || "not_sent"}
                        </span>
                        {order.steadfast_status && (
                          <span className="rounded-xl border border-border/50 px-3 py-2 text-[8px] uppercase tracking-[0.22em] text-foreground">
                            {order.steadfast_status.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>

                      {order.steadfast_consignment_id && (
                        <p className="mt-3 text-[9px] tracking-[0.1em] text-muted-foreground">
                          Consignment ID: {order.steadfast_consignment_id}
                        </p>
                      )}
                      {order.steadfast_tracking_code && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <p className="text-[9px] tracking-[0.1em] text-muted-foreground">
                            Tracking: {order.steadfast_tracking_code}
                          </p>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(order.steadfast_tracking_code || "")}
                            className="text-[8px] uppercase tracking-[0.22em] text-chrome"
                          >
                            Copy
                          </button>
                        </div>
                      )}
                      {order.steadfast_synced_at && (
                        <p className="mt-2 text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
                          Synced {new Date(order.steadfast_synced_at).toLocaleString("en-GB", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                      {order.steadfast_last_error && (
                        <p className="mt-3 max-w-2xl text-[9px] leading-relaxed text-muted-foreground">
                          {order.steadfast_last_error}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {order.status !== "pre_order" &&
                        order.status !== "new" &&
                        order.status !== "cancelled" &&
                        order.status !== "delivered" &&
                        order.steadfast_state !== "connected" && order.steadfast_state !== "test" && (
                          <button
                            type="button"
                            onClick={() => connectSteadfast.mutate(order.id)}
                            disabled={connectSteadfast.isPending}
                            className="rounded-xl border border-chrome/60 px-3 py-3 text-[8px] uppercase tracking-[0.22em] text-foreground disabled:opacity-50"
                          >
                            {order.steadfast_state === "error" ? "Retry Steadfast" : "Send to Steadfast"}
                          </button>
                        )}

                      {order.steadfast_state === "connected" && (
                        <button
                          type="button"
                          onClick={() => syncSteadfast.mutate(order.id)}
                          disabled={syncSteadfast.isPending}
                          className="rounded-xl border border-chrome/60 px-3 py-3 text-[8px] uppercase tracking-[0.22em] text-foreground disabled:opacity-50"
                        >
                          Sync Steadfast
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {timeline.length > 0 && (
                  <div className="mt-5 border-t border-border/50 pt-5">
                    <span className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">Order timeline</span>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {timeline.map(([label, time]) => (
                        <div key={String(label)} className="rounded-xl border border-border/40 px-3 py-3">
                          <span className="block text-[8px] uppercase tracking-[0.22em] text-foreground">{label}</span>
                          <span className="mt-2 block text-[9px] text-muted-foreground">
                            {new Date(String(time)).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {order.status === "cancelled" &&
                  order.steadfast_state !== "connected" &&
                  !order.steadfast_consignment_id &&
                  !order.steadfast_tracking_code && (
                    <div className="mt-5 border-t border-border/50 pt-5">
                      <button
                        type="button"
                        onClick={() => {
                          const ok = window.confirm(
                            `Permanently delete ${order.order_number}? This cannot be undone.`,
                          );
                          if (ok) deleteCancelledOrder.mutate(order);
                        }}
                        disabled={deleteCancelledOrder.isPending}
                        className="inline-flex items-center gap-2 rounded-xl border border-border/70 px-4 py-3 text-[8px] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" />
                        Delete cancelled order
                      </button>
                      <p className="mt-2 text-[8px] leading-relaxed text-muted-foreground">
                        Available only for cancelled orders that were not connected to a real Steadfast parcel.
                      </p>
                    </div>
                  )}

                {order.customer_note && (
                  <div className="mt-5 border-t border-border/50 pt-5">
                    <span className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">
                      Customer note
                    </span>
                    <p className="mt-3 text-xs leading-relaxed tracking-[0.06em] text-muted-foreground">
                      {order.customer_note}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
