import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSite } from "@/lib/settings";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/preorders")({
  component: AdminPreorders,
});

const STATUSES = ["new", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
type OrderStatus = (typeof STATUSES)[number];

type Preorder = {
  id: string;
  order_number: string;
  source: string;
  status: OrderStatus;
  customer_name: string;
  phone: string;
  delivery_address: string;
  map_url: string | null;
  product_name: string;
  product_code: string;
  quantity: number;
  selected_size: string | null;
  selected_finish: string | null;
  selected_color: string | null;
  total_price: number | string;
  payment_method: string;
  payment_status: string;
  transaction_id: string | null;
  customer_note: string | null;
  created_at: string;
};

function isPreorderOrder(order: Preorder) {
  const source = String(order.source || "").toLowerCase();
  const note = String(order.customer_note || "").toLowerCase();
  return source.includes("preorder") || source.includes("pre-order") || note.includes("pre-order");
}

function AdminPreorders() {
  const site = useSite();
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ["admin-preorders"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return ((data ?? []) as Preorder[]).filter(isPreorderOrder);
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await (supabase as any).from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-preorders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Pre-order updated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update pre-order."),
  });

  const orders = ordersQuery.data ?? [];
  const newCount = orders.filter((order) => order.status === "new").length;
  const confirmedCount = orders.filter((order) => order.status === "confirmed").length;
  const liveCount = orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length;

  return (
    <div className="space-y-7 pb-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-[0.45em] text-muted-foreground">
            ZZERKOFF / STUDIO
          </span>
          <h1 className="mt-4 font-display text-xl tracking-[0.22em] text-foreground sm:text-2xl">
            PRE-ORDER
          </h1>
          <p className="mt-3 text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
            {orders.length} total · {newCount} new · {liveCount} active
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/orders"
            className="rounded-xl border border-border/60 px-4 py-3 text-[9px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground"
          >
            All Orders
          </Link>
          <button
            type="button"
            onClick={() => ordersQuery.refetch()}
            className="flex items-center gap-2 rounded-xl border border-border/60 px-4 py-3 text-[9px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className={`size-3.5 ${ordersQuery.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["NEW PRE-ORDER", newCount],
          ["CONFIRMED", confirmedCount],
          ["ACTIVE", liveCount],
        ].map(([label, value]) => (
          <div key={String(label)} className="glass-panel rounded-[20px] p-4">
            <span className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground">{label}</span>
            <p className="mt-2 font-display text-xl tracking-[0.14em] text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {ordersQuery.isLoading ? (
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Loading pre-orders…</p>
      ) : ordersQuery.error ? (
        <div className="glass-panel rounded-[24px] p-6">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Could not load pre-orders. Make sure the pre-order SQL migration is applied.
          </p>
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-panel rounded-[24px] p-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            No pre-orders yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const selected = [order.selected_color, order.selected_size, order.selected_finish].filter(Boolean).join(" / ");
            return (
              <article key={order.id} className="glass-panel rounded-[24px] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/50 pb-5">
                  <div>
                    <span className="rounded-full border border-chrome/50 bg-white/[0.04] px-3 py-1 text-[8px] uppercase tracking-[0.25em] text-chrome">
                      PRE-ORDER
                    </span>
                    <h2 className="mt-4 font-display text-base tracking-[0.16em] text-foreground">
                      {order.order_number}
                    </h2>
                    <p className="mt-2 text-[8px] uppercase tracking-[0.28em] text-muted-foreground">
                      {new Date(order.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
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
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-6 lg:grid-cols-3">
                  <div>
                    <span className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">Customer</span>
                    <p className="mt-3 text-xs tracking-[0.08em] text-foreground">{order.customer_name}</p>
                    <a href={`tel:${order.phone}`} className="mt-2 block text-xs tracking-[0.08em] text-chrome hover:text-foreground">
                      {order.phone}
                    </a>
                  </div>

                  <div>
                    <span className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">Object</span>
                    <p className="mt-3 font-display text-sm tracking-[0.12em] text-foreground">{order.product_name}</p>
                    <p className="mt-2 text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                      {order.product_code}{selected ? ` · ${selected}` : ""} · QTY {order.quantity}
                    </p>
                    <p className="mt-3 text-xs tracking-[0.15em] text-chrome">
                      {site.currencySymbol}{Number(order.total_price).toLocaleString("en-US")}
                    </p>
                    <p className="mt-2 text-[8px] uppercase tracking-[0.22em] text-muted-foreground">
                      {order.payment_method} · {order.payment_status}{order.transaction_id ? ` · ${order.transaction_id}` : ""}
                    </p>
                  </div>

                  <div>
                    <span className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">Delivery</span>
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
                        Open map <ArrowUpRight className="size-3" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
