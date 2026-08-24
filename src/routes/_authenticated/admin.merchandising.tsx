import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminProducts, useAllCategories } from "@/lib/products";
import {
  useAdminHomepageMerch,
  type HomepageMerchSection,
  type MerchSectionType,
} from "@/lib/merchandising";
import { AdminButton, Field, Toggle, adminField } from "@/components/admin/AdminUI";

export const Route = createFileRoute("/_authenticated/admin/merchandising")({
  component: AdminMerchandising,
});

type Draft = {
  id?: string;
  internal_name: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  section_type: MerchSectionType;
  category_slug: string;
  product_ids: string[];
  limit_count: string;
  button_label: string;
  button_href: string;
  active: boolean;
  sort_order: string;
};

const emptyDraft = (): Draft => ({
  internal_name: "Homepage edit",
  eyebrow: "ZZ / CURATED",
  title: "",
  subtitle: "",
  section_type: "manual",
  category_slug: "",
  product_ids: [],
  limit_count: "4",
  button_label: "SHOP ALL",
  button_href: "/shop",
  active: true,
  sort_order: "0",
});

function fromSection(section: HomepageMerchSection): Draft {
  return {
    id: section.id,
    internal_name: section.internal_name,
    eyebrow: section.eyebrow,
    title: section.title,
    subtitle: section.subtitle,
    section_type: section.section_type,
    category_slug: section.category_slug,
    product_ids: section.product_ids ?? [],
    limit_count: String(section.limit_count ?? 4),
    button_label: section.button_label,
    button_href: section.button_href,
    active: section.active,
    sort_order: String(section.sort_order ?? 0),
  };
}

function AdminMerchandising() {
  const queryClient = useQueryClient();
  const { data: sections = [], isLoading } = useAdminHomepageMerch();
  const { data: products = [] } = useAdminProducts();
  const { data: categories = [] } = useAllCategories();
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDirty(true);
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!draft.internal_name.trim()) throw new Error("Internal name is required.");
      if (!draft.title.trim()) throw new Error("Section title is required.");
      if (draft.section_type === "category" && !draft.category_slug) {
        throw new Error("Choose a category for this section.");
      }
      if (draft.section_type === "manual" && draft.product_ids.length === 0) {
        throw new Error("Select at least one product for a manual section.");
      }

      const payload = {
        internal_name: draft.internal_name.trim(),
        eyebrow: draft.eyebrow.trim(),
        title: draft.title.trim(),
        subtitle: draft.subtitle.trim(),
        section_type: draft.section_type,
        category_slug: draft.category_slug,
        product_ids: draft.product_ids,
        limit_count: Math.max(1, Math.min(12, Number(draft.limit_count || 4))),
        button_label: draft.button_label.trim(),
        button_href: draft.button_href.trim() || "/shop",
        active: draft.active,
        sort_order: Number(draft.sort_order || 0),
      };

      if (draft.id) {
        const { error } = await (supabase as any)
          .from("homepage_merch_sections")
          .update(payload)
          .eq("id", draft.id);
        if (error) throw error;
        return;
      }

      const { error } = await (supabase as any)
        .from("homepage_merch_sections")
        .insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(draft.id ? "Homepage section updated." : "Homepage section created.");
      setDirty(false);
      setEditing(false);
      setDraft(emptyDraft());
      queryClient.invalidateQueries({ queryKey: ["homepage-merch"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save section. Run the homepage merchandising migration first.",
      ),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("homepage_merch_sections")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Homepage section deleted.");
      queryClient.invalidateQueries({ queryKey: ["homepage-merch"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Delete failed."),
  });

  const toggleProduct = (id: string) => {
    setDirty(true);
    setDraft((prev) => ({
      ...prev,
      product_ids: prev.product_ids.includes(id)
        ? prev.product_ids.filter((value) => value !== id)
        : [...prev.product_ids, id].slice(0, 12),
    }));
  };

  return (
    <div className="space-y-8 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-[0.42em] text-muted-foreground">
            HOMEPAGE / MERCHANDISING
          </span>
          <h1 className="mt-4 font-display text-xl tracking-[0.22em] text-foreground">
            MERCH SECTIONS
          </h1>
          <p className="mt-3 max-w-2xl text-[10px] leading-relaxed text-muted-foreground">
            Build curated homepage product rows without changing code. Choose manual objects, a category,
            new objects, featured objects or sale objects.
          </p>
        </div>
        <AdminButton
          tone="primary"
          onClick={() => {
            setDraft(emptyDraft());
            setEditing(true);
            setDirty(false);
          }}
        >
          + New section
        </AdminButton>
      </div>

      <section>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {isLoading ? (
            <span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Loading…</span>
          ) : sections.length === 0 ? (
            <div className="glass-panel min-w-full rounded-[22px] p-5 text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
              No merchandising sections yet. If this is your first time, run migration 20260825001500_homepage_merchandising.sql.
            </div>
          ) : (
            sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  setDraft(fromSection(section));
                  setEditing(true);
                  setDirty(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="glass-panel min-w-[220px] rounded-[20px] p-4 text-left transition-colors hover:border-chrome/60"
              >
                <span className="text-[8px] uppercase tracking-[0.28em] text-muted-foreground">
                  {section.section_type} · {section.active ? "LIVE" : "HIDDEN"}
                </span>
                <span className="mt-2 block truncate text-[10px] uppercase tracking-[0.22em] text-foreground">
                  {section.internal_name}
                </span>
                <span className="mt-2 block text-[8px] uppercase tracking-[0.22em] text-chrome">
                  ORDER {section.sort_order}
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      {editing && (
        <section className="glass-panel space-y-7 rounded-[26px] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-5">
            <div>
              <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
                {draft.id ? "EDIT SECTION" : "NEW SECTION"}
              </span>
              <h2 className="mt-2 font-display text-sm tracking-[0.2em] text-foreground">
                HOMEPAGE CURATION
              </h2>
            </div>
            {draft.id && (
              <AdminButton
                tone="danger"
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm(`Delete "${draft.internal_name}"?`)) {
                    remove.mutate(draft.id!);
                    setEditing(false);
                  }
                }}
              >
                Delete
              </AdminButton>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Internal name *">
              <input className={adminField} value={draft.internal_name} onChange={(e) => set("internal_name", e.target.value)} />
            </Field>
            <Field label="Display type">
              <select className={adminField} value={draft.section_type} onChange={(e) => set("section_type", e.target.value as MerchSectionType)}>
                <option value="manual">MANUAL PRODUCTS</option>
                <option value="category">CATEGORY</option>
                <option value="new">NEW OBJECTS</option>
                <option value="featured">FEATURED OBJECTS</option>
                <option value="sale">SALE OBJECTS</option>
              </select>
            </Field>
            <Field label="Eyebrow / small label">
              <input className={adminField} value={draft.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} placeholder="ZZ / CURATED" />
            </Field>
            <Field label="Section title *">
              <input className={adminField} value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="AFTERDARK PICKS" />
            </Field>
          </div>

          <Field label="Subtitle">
            <textarea className={adminField} rows={2} value={draft.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
          </Field>

          {draft.section_type === "category" && (
            <Field label="Category">
              <select className={adminField} value={draft.category_slug} onChange={(e) => set("category_slug", e.target.value)}>
                <option value="">SELECT CATEGORY…</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>{category.name}</option>
                ))}
              </select>
            </Field>
          )}

          {draft.section_type === "manual" && (
            <div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[9px] uppercase tracking-[0.35em] text-muted-foreground">SELECT PRODUCTS</span>
                <span className="text-[8px] uppercase tracking-[0.25em] text-chrome">{draft.product_ids.length} selected</span>
              </div>
              <div className="mt-4 grid max-h-[420px] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                {products.filter((product) => product.published && !product.archived).map((product) => {
                  const selected = draft.product_ids.includes(product.id);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => toggleProduct(product.id)}
                      className={`rounded-xl border p-3 text-left transition-colors ${selected ? "border-chrome/70 bg-white/[0.05]" : "border-border/45"}`}
                    >
                      <span className="block text-[8px] uppercase tracking-[0.24em] text-muted-foreground">{product.product_code}</span>
                      <span className="mt-1 block truncate text-[9px] uppercase tracking-[0.2em] text-foreground">{selected ? "✓ " : ""}{product.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Max products">
              <input className={adminField} type="number" min={1} max={12} value={draft.limit_count} onChange={(e) => set("limit_count", e.target.value)} />
            </Field>
            <Field label="Sort order">
              <input className={adminField} type="number" value={draft.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
            </Field>
            <Field label="Button label">
              <input className={adminField} value={draft.button_label} onChange={(e) => set("button_label", e.target.value)} placeholder="SHOP ALL" />
            </Field>
            <Field label="Button link">
              <input className={adminField} value={draft.button_href} onChange={(e) => set("button_href", e.target.value)} placeholder="/shop" />
            </Field>
          </div>

          <Toggle label={draft.active ? "Live on homepage" : "Hidden from homepage"} checked={draft.active} onChange={(value) => set("active", value)} />

          <div className="flex flex-wrap gap-3 border-t border-border/50 pt-5">
            <AdminButton tone="primary" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : draft.id ? "Save changes" : "Create section"}
            </AdminButton>
            <AdminButton
              onClick={() => {
                if (!dirty || confirm("Discard unsaved changes?")) {
                  setEditing(false);
                  setDirty(false);
                }
              }}
            >
              Cancel
            </AdminButton>
          </div>
        </section>
      )}
    </div>
  );
}
