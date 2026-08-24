import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

function AdminProducts() {
  const { data: products = [], isLoading } = useAdminProducts();
  const { price } = useSite();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["products"] });

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

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      const searchOk =
        !needle ||
        p.name.toLowerCase().includes(needle) ||
        p.product_code.toLowerCase().includes(needle) ||
        p.category.toLowerCase().includes(needle);

      const categoryLabel = prettyCategory(p.category);
      const filterOk =
        filter === "ALL" ||
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
  }, [products, q, filter]);

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
        {visible.map((p) => (
          <div
            key={p.id}
            className="glass-panel flex flex-wrap items-center gap-4 rounded-[22px] p-4"
          >
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
                {p.published ? "PUBLISHED" : "DRAFT"}
                {p.featured ? " · FEATURED" : ""}
                {p.new_collection ? " · NEW COLLECTION" : ""}
                {p.archived ? " · ARCHIVED" : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
        ))}
      </div>
    </div>
  );
}
