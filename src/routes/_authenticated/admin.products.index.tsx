import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminProducts, isSoldOut, prettyCategory, type Product } from "@/lib/products";
import { useSite } from "@/lib/settings";
import { SmartImage } from "@/components/site/SmartImage";
import { AdminButton, adminField } from "@/components/admin/AdminUI";

export const Route = createFileRoute("/_authenticated/admin/products/")({
  component: AdminProducts,
});

const FILTERS = [
  "ALL",
  "BEST SELLING",
  "RINGS",
  "BRACELETS",
  "CHAINS",
  "PANT CHAINS",
  "EARRINGS",
  "EYEWEAR",
  "WATCH",
  "WATCHES",
  "IN STOCK",
  "LOW STOCK",
  "PRE-ORDER",
  "SOLD OUT",
  "FEATURED",
  "NEW COLLECTION",
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
] as const;

type SalesRow = {
  product_id: string | null;
  status: string;
  source?: string | null;
};

function AdminProducts() {
  const { data: products = [], isLoading } = useAdminProducts();
  const { price } = useSite();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const salesQuery = useQuery({
    queryKey: ["admin-product-sales"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("orders")
        .select("product_id,status,source")
        .neq("status", "cancelled");

      if (error) throw error;
      return (data ?? []) as SalesRow[];
    },
  });

  const salesCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of salesQuery.data ?? []) {
      if (!row.product_id) continue;
      map.set(row.product_id, (map.get(row.product_id) ?? 0) + 1);
    }
    return map;
  }, [salesQuery.data]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["admin-product-sales"] });
  };

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Product> }) => {
      const { error } = await supabase.from("products").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast.success("Object updated");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Update failed"),
  });

  const saveOrder = useMutation({
    mutationFn: async (rows: Product[]) => {
      await Promise.all(
        rows.map((product, index) =>
          supabase
            .from("products")
            .update({ sort_order: (index + 1) * 10 } as any)
            .eq("id", product.id),
        ),
      );
    },
    onSuccess: () => {
      refresh();
      toast.success("Shop/category order saved");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save order"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Object deleted");
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      const searchOk =
        !needle ||
        p.name.toLowerCase().includes(needle) ||
        p.product_code.toLowerCase().includes(needle) ||
        p.category.toLowerCase().includes(needle);

      const categoryLabel = prettyCategory(p.category);
      const sold = salesCount.get(p.id) ?? Number((p as any).sales_count ?? 0);
      const filterOk =
        filter === "ALL" ||
        (filter === "BEST SELLING" && sold > 0) ||
        filter === categoryLabel ||
        (filter === "IN STOCK" && !isSoldOut(p) && p.stock_status === "IN STOCK") ||
        (filter === "LOW STOCK" && p.stock_status === "LOW STOCK") ||
        (filter === "PRE-ORDER" && p.stock_status === "PRE-ORDER") ||
        (filter === "SOLD OUT" && isSoldOut(p)) ||
        (filter === "FEATURED" && p.featured) ||
        (filter === "NEW COLLECTION" && p.new_collection) ||
        (filter === "DRAFT" && !p.published) ||
        (filter === "PUBLISHED" && p.published) ||
        (filter === "ARCHIVED" && p.archived);

      return searchOk && filterOk;
    });
  }, [products, q, filter, salesCount]);

  const visible = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (filter === "BEST SELLING") {
        const soldDiff = (salesCount.get(b.id) ?? 0) - (salesCount.get(a.id) ?? 0);
        if (soldDiff !== 0) return soldDiff;
      }
      const orderDiff = Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      const soldDiff = (salesCount.get(b.id) ?? 0) - (salesCount.get(a.id) ?? 0);
      if (soldDiff !== 0) return soldDiff;
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    });
  }, [filtered, filter, salesCount]);

  const reorderVisible = (next: Product[]) => saveOrder.mutate(next);

  const moveToTop = (product: Product) => {
    reorderVisible([product, ...visible.filter((row) => row.id !== product.id)]);
  };

  const moveByStep = (product: Product, direction: -1 | 1) => {
    const index = visible.findIndex((row) => row.id === product.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= visible.length) return;
    const next = [...visible];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    reorderVisible(next);
  };

  const sortBestSelling = () => {
    const next = [...visible].sort((a, b) => {
      const soldDiff = (salesCount.get(b.id) ?? 0) - (salesCount.get(a.id) ?? 0);
      if (soldDiff !== 0) return soldDiff;
      return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    });
    reorderVisible(next);
  };

  const onDragStart = (event: DragEvent<HTMLDivElement>, id: string) => {
    setDraggingId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain") || draggingId;
    setDraggingId(null);
    if (!sourceId || sourceId === targetId) return;
    const sourceIndex = visible.findIndex((row) => row.id === sourceId);
    const targetIndex = visible.findIndex((row) => row.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...visible];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved!);
    reorderVisible(next);
  };

  return (
    <div className="space-y-7 pb-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
            CATALOGUE / CMS
          </span>
          <h1 className="mt-4 font-display text-xl tracking-[0.22em] text-foreground">
            OBJECTS
          </h1>
          <p className="mt-3 text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
            Drag products to control Shop + Category order. Best-selling can auto-sort front.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/products/bulk"
            className="rounded-xl border border-chrome/60 bg-white/[0.05] px-5 py-3 text-[9px] uppercase tracking-[0.32em] text-chrome hover:bg-white/[0.1]"
          >
            AI Bulk Import
          </Link>
          <Link
            to="/admin/products/new"
            className="rounded-xl border border-chrome/60 bg-white/[0.05] px-5 py-3 text-[9px] uppercase tracking-[0.35em] text-foreground hover:bg-white/[0.1]"
          >
            + New object
          </Link>
        </div>
      </div>

      <div className="glass-panel space-y-4 rounded-[22px] p-4">
        <input
          className={adminField}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="SEARCH NAME OR PRODUCT CODE"
        />
        <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-[8px] uppercase tracking-[0.25em] ${
                filter === f
                  ? "border-chrome/60 bg-white/[0.05] text-foreground"
                  : "border-border/50 text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/45 bg-white/[0.02] p-3">
          <p className="text-[8px] uppercase tracking-[0.25em] text-muted-foreground">
            Showing {visible.length} objects · order saves to public Shop and category pages
          </p>
          <button
            type="button"
            onClick={sortBestSelling}
            disabled={saveOrder.isPending || visible.length < 2}
            className="rounded-xl border border-chrome/50 px-4 py-3 text-[8px] uppercase tracking-[0.24em] text-chrome disabled:opacity-50"
          >
            Auto sort best-selling first
          </button>
        </div>
      </div>

      {isLoading && (
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Loading objects…
        </p>
      )}

      {!isLoading && visible.length === 0 && (
        <div className="glass-panel rounded-[22px] p-8 text-center">
          <p className="font-display text-lg tracking-[0.2em] text-foreground">
            NO OBJECTS FOUND
          </p>
          <Link
            to="/admin/products/new"
            className="mt-5 inline-block text-[9px] uppercase tracking-[0.35em] text-chrome"
          >
            + New object
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {visible.map((p, index) => {
          const sold = salesCount.get(p.id) ?? Number((p as any).sales_count ?? 0);
          return (
            <div
              key={p.id}
              draggable
              onDragStart={(event) => onDragStart(event, p.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => onDrop(event, p.id)}
              className={`glass-panel flex flex-wrap items-center gap-4 rounded-[22px] p-4 ${
                draggingId === p.id ? "opacity-50" : ""
              }`}
            >
              <div className="grid size-10 shrink-0 cursor-grab place-items-center rounded-xl border border-border/50 text-[10px] text-muted-foreground active:cursor-grabbing">
                ⋮⋮
              </div>
              <div className="w-10 shrink-0 text-center text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                #{index + 1}
              </div>
              <SmartImage
                src={p.primary_image}
                alt={p.name}
                width={120}
                height={150}
                className="size-16 shrink-0 rounded-xl object-cover grayscale"
              />
              <div className="min-w-[12rem] flex-1">
                <span className="block text-[9px] tracking-[0.35em] text-muted-foreground">
                  {p.product_code} · {prettyCategory(p.category)}
                </span>
                <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-foreground">
                  {p.name}
                </p>
                <p className="mt-1 text-[10px] tracking-[0.18em] text-chrome">
                  {price(p.price)} · QTY {p.quantity_available} · {p.stock_status}
                </p>
                <p className="mt-1 text-[8px] uppercase tracking-[0.25em] text-muted-foreground">
                  SOLD/PRE-ORDER {sold} · SORT {Number(p.sort_order ?? 0)}
                  {p.published ? " · PUBLISHED" : " · DRAFT"}
                  {p.featured ? " · FEATURED" : ""}
                  {p.new_collection ? " · NEW COLLECTION" : ""}
                  {p.archived ? " · ARCHIVED" : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <AdminButton onClick={() => moveToTop(p)}>Top</AdminButton>
                <AdminButton onClick={() => moveByStep(p, -1)}>↑</AdminButton>
                <AdminButton onClick={() => moveByStep(p, 1)}>↓</AdminButton>
                <AdminButton
                  onClick={() =>
                    patch.mutate({ id: p.id, values: { published: !p.published } })
                  }
                >
                  {p.published ? "Unpublish" : "Publish"}
                </AdminButton>
                <Link
                  to="/admin/products/$id"
                  params={{ id: p.id }}
                  className="rounded-xl border border-chrome/60 px-5 py-3 text-[9px] uppercase tracking-[0.35em] text-foreground"
                >
                  Edit
                </Link>
                <AdminButton
                  tone="danger"
                  onClick={() => {
                    if (confirm(`DELETE THIS OBJECT?\n\n${p.product_code} — ${p.name}`)) {
                      remove.mutate(p.id);
                    }
                  }}
                >
                  Delete
                </AdminButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
