import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, RefreshCw, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminButton } from "@/components/admin/AdminUI";
import { dispatchGrowthNotifications } from "@/lib/growth.functions";

export const Route = createFileRoute("/_authenticated/admin/growth")({
  component: AdminGrowth,
});

function productName(row: any) {
  const product = Array.isArray(row.products) ? row.products[0] : row.products;
  return product?.name || "Unknown object";
}

function AdminGrowth() {
  const queryClient = useQueryClient();
  const dispatch = useServerFn(dispatchGrowthNotifications);

  const reviews = useQuery({
    queryKey: ["admin-growth-reviews"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("product_reviews")
        .select("id,product_id,rating,title,body,status,verified_purchase,created_at,products(name,slug)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const restocks = useQuery({
    queryKey: ["admin-growth-restocks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("restock_alerts")
        .select("id,email,phone,created_at,notified_at,products(name,slug,quantity_available,stock_status)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const notifications = useQuery({
    queryKey: ["admin-growth-notifications"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("commerce_notification_events")
        .select("id,order_number,event_type,email,phone,delivery_status,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const moderate = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" | "pending" }) => {
      const { error } = await (supabase as any)
        .from("product_reviews")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-growth-reviews"] });
      toast.success("Review status updated.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Review update failed."),
  });

  const retry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("commerce_notification_events")
        .update({ delivery_status: "queued" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-growth-notifications"] }),
  });

  const sendQueued = useMutation({
    mutationFn: async () => dispatch({ data: undefined }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-growth-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-growth-restocks"] });
      toast.success(`Notification run complete: ${result.sent} sent, ${result.failed} failed.`);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Notification run failed."),
  });

  const reviewRows = reviews.data ?? [];
  const restockRows = restocks.data ?? [];
  const notificationRows = notifications.data ?? [];
  const pendingReviews = reviewRows.filter((row: any) => row.status === "pending").length;
  const pendingRestocks = restockRows.filter((row: any) => !row.notified_at).length;
  const queuedNotifications = notificationRows.filter((row: any) => row.delivery_status === "queued").length;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-[0.45em] text-muted-foreground">ZZERKOFF / GROWTH</span>
          <h1 className="mt-4 font-display text-xl tracking-[0.22em] text-foreground sm:text-2xl">GROWTH CONTROL</h1>
          <p className="mt-3 max-w-2xl text-[10px] leading-relaxed text-muted-foreground">
            Moderate verified reviews, monitor restock demand and manage customer notification delivery.
          </p>
        </div>
        <AdminButton tone="primary" disabled={sendQueued.isPending} onClick={() => sendQueued.mutate()}>
          {sendQueued.isPending ? "Sending..." : "Send queued notifications"}
        </AdminButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={<Star className="size-4" />} label="Pending reviews" value={pendingReviews} />
        <Metric icon={<Users className="size-4" />} label="Restock signals" value={pendingRestocks} />
        <Metric icon={<BellRing className="size-4" />} label="Queued notifications" value={queuedNotifications} />
      </div>

      <section className="glass-panel rounded-[24px] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">Trust</span>
            <h2 className="mt-2 font-display text-sm tracking-[0.18em] text-foreground">REVIEW MODERATION</h2>
          </div>
          <button type="button" onClick={() => reviews.refetch()} className="text-muted-foreground hover:text-foreground" aria-label="Refresh reviews">
            <RefreshCw className={`size-4 ${reviews.isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {reviewRows.length === 0 ? (
            <Empty text="No reviews yet." />
          ) : reviewRows.map((review: any) => (
            <article key={review.id} className="rounded-2xl border border-border/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-[8px] uppercase tracking-[0.25em] text-chrome">{productName(review)}</span>
                  <p className="mt-2 text-sm tracking-[0.12em] text-foreground">{"★".repeat(Number(review.rating))}{"☆".repeat(5 - Number(review.rating))}</p>
                </div>
                <span className="rounded-lg border border-border/50 px-3 py-2 text-[8px] uppercase tracking-[0.2em] text-muted-foreground">{review.status}</span>
              </div>
              {review.title && <h3 className="mt-4 text-xs text-foreground">{review.title}</h3>}
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{review.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <AdminButton tone="primary" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: review.id, status: "approved" })}>Approve</AdminButton>
                <AdminButton disabled={moderate.isPending} onClick={() => moderate.mutate({ id: review.id, status: "pending" })}>Pending</AdminButton>
                <AdminButton tone="danger" disabled={moderate.isPending} onClick={() => moderate.mutate({ id: review.id, status: "rejected" })}>Reject</AdminButton>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-[24px] p-5 sm:p-6">
        <span className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">Demand</span>
        <h2 className="mt-2 font-display text-sm tracking-[0.18em] text-foreground">RESTOCK SIGNALS</h2>
        <div className="mt-5 space-y-2">
          {restockRows.length === 0 ? <Empty text="No restock subscribers yet." /> : restockRows.map((row: any) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 p-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-foreground">{productName(row)}</p>
                <p className="mt-2 text-[9px] text-muted-foreground">{row.email || row.phone || "No contact"}</p>
              </div>
              <span className="text-[8px] uppercase tracking-[0.22em] text-chrome">{row.notified_at ? "Notified" : "Waiting"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-[24px] p-5 sm:p-6">
        <span className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">Delivery</span>
        <h2 className="mt-2 font-display text-sm tracking-[0.18em] text-foreground">NOTIFICATION QUEUE</h2>
        <p className="mt-3 text-[9px] leading-relaxed text-muted-foreground">
          Email delivery requires RESEND_API_KEY + RESEND_FROM_EMAIL. WhatsApp/SMS can use NOTIFICATION_WEBHOOK_URL.
        </p>
        <div className="mt-5 space-y-2">
          {notificationRows.length === 0 ? <Empty text="No notification events yet." /> : notificationRows.map((row: any) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 p-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-foreground">{row.order_number} · {String(row.event_type).replace(/_/g, " ")}</p>
                <p className="mt-2 text-[9px] text-muted-foreground">{row.email || row.phone || "No delivery contact"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] uppercase tracking-[0.22em] text-chrome">{row.delivery_status}</span>
                {row.delivery_status === "failed" && (
                  <AdminButton onClick={() => retry.mutate(row.id)} disabled={retry.isPending}>Retry</AdminButton>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="glass-panel rounded-[20px] p-4">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-[8px] uppercase tracking-[0.25em]">{label}</span></div>
      <p className="mt-3 font-display text-xl tracking-[0.12em] text-foreground">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-border/40 p-5 text-[9px] uppercase tracking-[0.25em] text-muted-foreground">{text}</p>;
}
