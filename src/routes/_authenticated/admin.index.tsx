import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminProducts, isSoldOut } from "@/lib/products";
import { useAdminCollections, useAdminPosts } from "@/lib/cms";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

const quickLinks = [
  { label: "+ NEW OBJECT", to: "/admin/products/new" as const },
  { label: "MANAGE ORDERS", to: "/admin/orders" as const },
  { label: "+ NEW BLOG POST", to: "/admin/blog/new" as const },
  { label: "MANAGE OBJECTS", to: "/admin/products" as const },
  { label: "MANAGE CATEGORIES", to: "/admin/categories" as const },
  { label: "MANAGE COLLECTIONS", to: "/admin/collections" as const },
  { label: "EDIT WEBSITE", to: "/admin/pages" as const },
  { label: "SETTINGS", to: "/admin/settings" as const },
];

function AdminDashboard() {
  const { data: products = [], isLoading: loadingProducts } = useAdminProducts();
  const { data: collections = [], isLoading: loadingCollections } = useAdminCollections();
  const { data: posts = [], isLoading: loadingPosts } = useAdminPosts();
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["admin-dashboard-orders"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("orders")
        .select("id,status,payment_status,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const loading = loadingProducts || loadingCollections || loadingPosts || loadingOrders;
  const stats = [
    { label: "TOTAL OBJECTS", value: products.length },
    { label: "PUBLISHED", value: products.filter((p) => p.published).length },
    {
      label: "IN STOCK",
      value: products.filter((p) => !isSoldOut(p) && p.stock_status === "IN STOCK").length,
    },
    { label: "SOLD OUT", value: products.filter(isSoldOut).length },
    { label: "NEW COLLECTION", value: products.filter((p) => p.new_collection).length },
    { label: "ARCHIVED", value: products.filter((p) => p.archived).length },
    { label: "FEATURED OBJECTS", value: products.filter((p) => p.featured).length },
    { label: "BLOG POSTS", value: posts.length },
    { label: "NEW ORDERS", value: orders.filter((o: any) => o.status === "new").length },
    { label: "PROCESSING", value: orders.filter((o: any) => o.status === "processing").length },
    { label: "SHIPPED", value: orders.filter((o: any) => o.status === "shipped").length },
    { label: "DELIVERED", value: orders.filter((o: any) => o.status === "delivered").length },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div>
        <span className="text-[9px] uppercase tracking-[0.45em] text-muted-foreground">
          ZZERKOFF / STUDIO
        </span>
        <h1 className="mt-4 font-display text-xl tracking-[0.22em] text-foreground sm:text-2xl">
          DASHBOARD
        </h1>
      </div>

      {loading ? (
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Loading studio data…
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="glass-panel rounded-[22px] p-5">
              <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
                {s.label}
              </span>
              <p className="mt-3 font-display text-2xl tracking-[0.15em] text-foreground">
                {s.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="glass-panel rounded-[24px] p-6">
        <span className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
          QUICK ACTIONS
        </span>
        <div className="mt-5 flex flex-wrap gap-3">
          {quickLinks.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="rounded-xl border border-border/60 px-4 py-3 text-[9px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:border-chrome/60 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-chrome/50 bg-white/[0.04] px-4 py-3 text-[9px] uppercase tracking-[0.3em] text-foreground"
          >
            VIEW LIVE WEBSITE
          </a>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel rounded-[24px] p-6">
          <span className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
            CURRENT COLLECTION
          </span>
          {collections.find((c) => c.is_current) ? (
            <div className="mt-4">
              <p className="font-display text-lg tracking-[0.18em] text-foreground">
                DROP {String(collections.find((c) => c.is_current)?.drop_number ?? 1).padStart(3, "0")}
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-chrome">
                {collections.find((c) => c.is_current)?.name}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">No current collection selected.</p>
          )}
        </div>

        <div className="glass-panel rounded-[24px] p-6">
          <span className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
            PUBLISHED JOURNAL
          </span>
          <p className="mt-4 font-display text-lg tracking-[0.18em] text-foreground">
            {posts.filter((p) => p.status === "published").length}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Published posts
          </p>
        </div>
      </div>
    </div>
  );
}
