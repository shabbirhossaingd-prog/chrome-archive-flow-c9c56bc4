import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useAdminProducts,
  useAllCategories,
  type Category,
} from "@/lib/products";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { SmartImage } from "@/components/site/SmartImage";
import {
  AdminButton,
  Field,
  Toggle,
  adminField,
} from "@/components/admin/AdminUI";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesPage,
});

type Draft = {
  name: string;
  slug: string;
  code_prefix: string;
  sort_order: string;
  active: boolean;
  image_url: string;
  seo_title: string;
  seo_description: string;
  og_image: string;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const prefixFromName = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase();

const blankDraft = (): Draft => ({
  name: "",
  slug: "",
  code_prefix: "",
  sort_order: "0",
  active: true,
  image_url: "",
  seo_title: "",
  seo_description: "",
  og_image: "",
});

const categoryToDraft = (category: Category): Draft => ({
  name: category.name ?? "",
  slug: category.slug ?? "",
  code_prefix: category.code_prefix ?? "",
  sort_order: String(category.sort_order ?? 0),
  active: category.active ?? true,
  image_url: category.image_url ?? "",
  seo_title: category.seo_title ?? "",
  seo_description: category.seo_description ?? "",
  og_image: category.og_image ?? "",
});

function CategoriesPage() {
  const { data: categories = [], isLoading } = useAllCategories();
  const { data: products = [] } = useAdminProducts();
  const [selected, setSelected] = useState<string | "new" | null>(null);

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      map.set(product.category, (map.get(product.category) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const selectedCategory =
    selected && selected !== "new"
      ? categories.find((category) => category.slug === selected) ?? null
      : null;

  return (
    <div className="space-y-8 pb-20">
      <div>
        <span className="text-[9px] uppercase tracking-[0.45em] text-muted-foreground">
          ZZERKOFF / STUDIO
        </span>
        <h1 className="mt-4 font-display text-xl tracking-[0.22em] text-foreground sm:text-2xl">
          CATEGORIES
        </h1>
        <p className="mt-4 max-w-2xl text-[10px] leading-relaxed text-muted-foreground">
          Select a category to edit it, or create a new one. Category and OG images can be uploaded directly.
        </p>
      </div>

      <section className="glass-panel rounded-[24px] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-sm tracking-[0.2em] text-foreground">
              CATEGORY SELECTOR
            </h2>
            <p className="mt-2 text-[9px] text-muted-foreground">
              {categories.length} categor{categories.length === 1 ? "y" : "ies"} · click one to edit
            </p>
          </div>
          <AdminButton tone="primary" onClick={() => setSelected("new")}>
            + New category
          </AdminButton>
        </div>

        {isLoading ? (
          <p className="mt-6 text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
            Loading categories...
          </p>
        ) : categories.length === 0 ? (
          <p className="mt-6 text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
            No categories yet.
          </p>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => {
              const active = selected === category.slug;
              const count = usage.get(category.slug) ?? 0;
              return (
                <button
                  key={category.slug}
                  type="button"
                  onClick={() => setSelected(category.slug)}
                  className={`group overflow-hidden rounded-2xl border text-left transition-all ${
                    active
                      ? "border-chrome/70 bg-white/[0.06]"
                      : "border-border/50 bg-black/20 hover:border-chrome/40 hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    {category.image_url ? (
                      <SmartImage
                        src={category.image_url}
                        alt={category.name}
                        width={112}
                        height={112}
                        className="size-14 shrink-0 rounded-xl object-cover grayscale"
                      />
                    ) : (
                      <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-border/50 bg-white/[0.02] text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
                        IMG
                      </div>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-xs tracking-[0.14em] text-foreground">
                        {category.name}
                      </span>
                      <span className="mt-2 block text-[8px] uppercase tracking-[0.22em] text-muted-foreground">
                        {count} object{count === 1 ? "" : "s"} · {category.code_prefix}
                      </span>
                      <span className={`mt-1 block text-[8px] uppercase tracking-[0.22em] ${category.active ? "text-chrome" : "text-muted-foreground"}`}>
                        {category.active ? "Active" : "Hidden"}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selected ? (
        <CategoryForm
          key={selected}
          category={selectedCategory}
          productCount={
            selectedCategory ? usage.get(selectedCategory.slug) ?? 0 : 0
          }
          onDone={() => setSelected(null)}
        />
      ) : (
        <div className="rounded-[24px] border border-dashed border-border/50 px-6 py-12 text-center">
          <p className="text-[9px] uppercase tracking-[0.35em] text-muted-foreground">
            Select a category above to edit
          </p>
        </div>
      )}
    </div>
  );
}

function CategoryForm({
  category,
  productCount,
  onDone,
}: {
  category: Category | null;
  productCount: number;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const editing = !!category;
  const [draft, setDraft] = useState<Draft>(() =>
    category ? categoryToDraft(category) : blankDraft(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) =>
    setErrors((prev) => ({ ...prev, [field]: "" }));

  const validate = () => {
    const next: Record<string, string> = {};
    if (!draft.name.trim()) next.name = "Category name is required.";
    if (!draft.slug.trim()) next.slug = "Slug is required.";
    if (!draft.code_prefix.trim()) {
      next.code_prefix = "Code prefix is required.";
    } else if (!/^[A-Z0-9]{1,6}$/.test(draft.code_prefix.trim().toUpperCase())) {
      next.code_prefix = "Use 1-6 letters/numbers only.";
    }
    if (category && productCount > 0 && draft.slug !== category.slug) {
      next.slug = "Slug cannot be changed while products use this category.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!validate()) {
        throw new Error("Complete the highlighted category fields.");
      }

      const payload = {
        name: draft.name.trim(),
        slug: slugify(draft.slug),
        code_prefix: draft.code_prefix.trim().toUpperCase(),
        sort_order: Number(draft.sort_order || 0),
        active: draft.active,
        image_url: draft.image_url.trim() || null,
        seo_title: draft.seo_title.trim(),
        seo_description: draft.seo_description.trim(),
        og_image: draft.og_image.trim(),
      };

      if (category) {
        const { error } = await supabase
          .from("categories")
          .update(payload)
          .eq("slug", category.slug);
        if (error) throw error;
        return "updated" as const;
      }

      const { error } = await supabase.from("categories").insert(payload);
      if (error) throw error;
      return "created" as const;
    },
    onSuccess: (action) => {
      toast.success(action === "created" ? "Category created." : "Category updated.");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onDone();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save category."),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!category) return false;
      if (productCount > 0) {
        throw new Error(
          `This category is used by ${productCount} product${productCount === 1 ? "" : "s"}. Move those products first.`,
        );
      }
      if (!window.confirm(`Delete category "${category.name}"?`)) return false;
      const { error } = await supabase.from("categories").delete().eq("slug", category.slug);
      if (error) throw error;
      return true;
    },
    onSuccess: (deleted) => {
      if (!deleted) return;
      toast.success("Category deleted.");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      onDone();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not delete category."),
  });

  return (
    <section className="glass-panel space-y-7 rounded-[24px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
            {editing ? "EDIT CATEGORY" : "NEW CATEGORY"}
          </span>
          <h2 className="mt-3 font-display text-lg tracking-[0.18em] text-foreground">
            {editing ? category?.name : "CREATE CATEGORY"}
          </h2>
          {editing && (
            <p className="mt-2 text-[9px] text-muted-foreground">
              {productCount} product{productCount === 1 ? "" : "s"} currently use this category
            </p>
          )}
        </div>
        <AdminButton onClick={onDone}>Close editor</AdminButton>
      </div>

      {Object.values(errors).some(Boolean) && (
        <div className="rounded-2xl border border-red-500/45 bg-red-500/[0.05] p-4">
          {Object.values(errors)
            .filter(Boolean)
            .map((message) => (
              <p key={message} className="text-[9px] leading-relaxed text-red-300">
                - {message}
              </p>
            ))}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category name *">
          <input
            className={`${adminField} ${errors.name ? "border-red-500/80" : ""}`}
            value={draft.name}
            onChange={(event) => {
              const name = event.target.value;
              clearError("name");
              setDraft((prev) => ({
                ...prev,
                name,
                slug: editing || prev.slug ? prev.slug : slugify(name),
                code_prefix: editing || prev.code_prefix ? prev.code_prefix : prefixFromName(name),
              }));
            }}
            placeholder="Rings"
          />
        </Field>

        <Field label="Slug *">
          <input
            className={`${adminField} ${errors.slug ? "border-red-500/80" : ""}`}
            value={draft.slug}
            disabled={editing && productCount > 0}
            onChange={(event) => {
              clearError("slug");
              setDraft((prev) => ({ ...prev, slug: slugify(event.target.value) }));
            }}
            placeholder="rings"
          />
          {editing && productCount > 0 && (
            <p className="mt-2 text-[8px] leading-relaxed text-muted-foreground">
              Slug is locked because products already use this category.
            </p>
          )}
        </Field>

        <Field label="Code prefix *">
          <input
            className={`${adminField} ${errors.code_prefix ? "border-red-500/80" : ""}`}
            value={draft.code_prefix}
            maxLength={6}
            onChange={(event) => {
              clearError("code_prefix");
              setDraft((prev) => ({
                ...prev,
                code_prefix: event.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
              }));
            }}
            placeholder="RNG"
          />
        </Field>

        <Field label="Sort order">
          <input
            className={adminField}
            type="number"
            value={draft.sort_order}
            onChange={(event) => setDraft((prev) => ({ ...prev, sort_order: event.target.value }))}
          />
        </Field>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/50 p-5">
          <ImageUploader
            label="Category image"
            max={1}
            value={draft.image_url ? [draft.image_url] : []}
            onChange={(value) => setDraft((prev) => ({ ...prev, image_url: value[0] ?? "" }))}
          />
          <p className="mt-3 text-[8px] leading-relaxed tracking-[0.12em] text-muted-foreground">
            Used on storefront category cards. Upload JPG, PNG or WebP; it will be web-optimized automatically.
          </p>
        </div>

        <div className="rounded-2xl border border-border/50 p-5">
          <ImageUploader
            label="OG / social image"
            max={1}
            value={draft.og_image ? [draft.og_image] : []}
            onChange={(value) => setDraft((prev) => ({ ...prev, og_image: value[0] ?? "" }))}
          />
          <p className="mt-3 text-[8px] leading-relaxed tracking-[0.12em] text-muted-foreground">
            Optional image for social sharing and category previews.
          </p>
        </div>
      </div>

      <div className="grid gap-5">
        <Field label="SEO title">
          <input
            className={adminField}
            value={draft.seo_title}
            maxLength={70}
            onChange={(event) => setDraft((prev) => ({ ...prev, seo_title: event.target.value }))}
            placeholder="Rings - ZZERKOFF"
          />
        </Field>

        <Field label="SEO description">
          <textarea
            className={adminField}
            rows={3}
            value={draft.seo_description}
            maxLength={170}
            onChange={(event) => setDraft((prev) => ({ ...prev, seo_description: event.target.value }))}
            placeholder="Search-friendly category description"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border/50 pt-6">
        <Toggle
          label={draft.active ? "Active category" : "Hidden category"}
          checked={draft.active}
          onChange={(active) => setDraft((prev) => ({ ...prev, active }))}
        />
        <AdminButton tone="primary" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving..." : editing ? "Save changes" : "Create category"}
        </AdminButton>
        {editing && (
          <AdminButton
            tone="danger"
            disabled={remove.isPending || productCount > 0}
            onClick={() => remove.mutate()}
          >
            {productCount > 0 ? "Move products before delete" : "Delete category"}
          </AdminButton>
        )}
      </div>
    </section>
  );
}
