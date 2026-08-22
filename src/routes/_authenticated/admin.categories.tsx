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
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useAllCategories();
  const { data: products = [] } = useAdminProducts();
  const [draft, setDraft] = useState<Draft>(() => blankDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      map.set(product.category, (map.get(product.category) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const validate = (value: Draft) => {
    const next: Record<string, string> = {};
    if (!value.name.trim()) next.name = "Category name is required.";
    if (!value.slug.trim()) next.slug = "Slug is required.";
    if (!value.code_prefix.trim()) {
      next.code_prefix = "Code prefix is required.";
    } else if (
      !/^[A-Z0-9]{1,6}$/.test(value.code_prefix.trim().toUpperCase())
    ) {
      next.code_prefix = "Use 1-6 letters/numbers only.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const createCategory = useMutation({
    mutationFn: async () => {
      if (!validate(draft)) {
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

      const { error } = await supabase.from("categories").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category created.");
      setDraft(blankDraft());
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create category.",
      ),
  });

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
          Create and manage product categories. Active categories appear in
          the product form and storefront filters.
        </p>
      </div>

      <section className="glass-panel space-y-6 rounded-[24px] p-6">
        <div>
          <h2 className="font-display text-sm tracking-[0.2em] text-foreground">
            ADD CATEGORY
          </h2>
          <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
            Name, slug and product-code prefix are required.
          </p>
        </div>

        {Object.keys(errors).length > 0 && (
          <div className="rounded-2xl border border-red-500/45 bg-red-500/[0.05] p-4">
            {Object.values(errors).map((message) => (
              <p
                key={message}
                className="text-[9px] leading-relaxed text-red-300"
              >
                - {message}
              </p>
            ))}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category name *">
            <input
              className={`${adminField} ${
                errors.name ? "border-red-500/80" : ""
              }`}
              value={draft.name}
              onChange={(event) => {
                const name = event.target.value;
                setErrors((prev) => ({ ...prev, name: "" }));
                setDraft((prev) => ({
                  ...prev,
                  name,
                  slug: prev.slug ? prev.slug : slugify(name),
                  code_prefix: prev.code_prefix
                    ? prev.code_prefix
                    : prefixFromName(name),
                }));
              }}
              placeholder="Rings"
            />
          </Field>

          <Field label="Slug *">
            <input
              className={`${adminField} ${
                errors.slug ? "border-red-500/80" : ""
              }`}
              value={draft.slug}
              onChange={(event) => {
                setErrors((prev) => ({ ...prev, slug: "" }));
                setDraft((prev) => ({
                  ...prev,
                  slug: slugify(event.target.value),
                }));
              }}
              placeholder="rings"
            />
          </Field>

          <Field label="Code prefix *">
            <input
              className={`${adminField} ${
                errors.code_prefix ? "border-red-500/80" : ""
              }`}
              value={draft.code_prefix}
              maxLength={6}
              onChange={(event) => {
                setErrors((prev) => ({ ...prev, code_prefix: "" }));
                setDraft((prev) => ({
                  ...prev,
                  code_prefix: event.target.value
                    .replace(/[^a-zA-Z0-9]/g, "")
                    .toUpperCase(),
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
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  sort_order: event.target.value,
                }))
              }
            />
          </Field>

          <Field label="Category image URL">
            <input
              className={adminField}
              value={draft.image_url}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  image_url: event.target.value,
                }))
              }
              placeholder="Optional"
            />
          </Field>

          <Field label="OG image URL">
            <input
              className={adminField}
              value={draft.og_image}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  og_image: event.target.value,
                }))
              }
              placeholder="Optional social share image"
            />
          </Field>
        </div>

        <Field label="SEO title">
          <input
            className={adminField}
            value={draft.seo_title}
            maxLength={70}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                seo_title: event.target.value,
              }))
            }
            placeholder="Rings - ZZERKOFF"
          />
        </Field>

        <Field label="SEO description">
          <textarea
            className={adminField}
            rows={3}
            value={draft.seo_description}
            maxLength={170}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                seo_description: event.target.value,
              }))
            }
            placeholder="Search-friendly category description"
          />
        </Field>

        <Toggle
          label={draft.active ? "Active category" : "Hidden category"}
          checked={draft.active}
          onChange={(active) =>
            setDraft((prev) => ({ ...prev, active }))
          }
        />

        <AdminButton
          tone="primary"
          disabled={createCategory.isPending}
          onClick={() => createCategory.mutate()}
        >
          {createCategory.isPending ? "Creating..." : "Create category"}
        </AdminButton>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-sm tracking-[0.2em] text-foreground">
            EXISTING CATEGORIES
          </h2>
          <p className="mt-2 text-[9px] text-muted-foreground">
            {categories.length} categories
          </p>
        </div>

        {isLoading ? (
          <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
            Loading categories...
          </p>
        ) : categories.length === 0 ? (
          <div className="glass-panel rounded-[24px] p-6 text-xs text-muted-foreground">
            No categories yet.
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <CategoryEditor
                key={category.slug}
                category={category}
                productCount={usage.get(category.slug) ?? 0}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CategoryEditor({
  category,
  productCount,
}: {
  category: Category;
  productCount: number;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() =>
    categoryToDraft(category),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const next: Record<string, string> = {};
    if (!draft.name.trim()) next.name = "Category name is required.";
    if (!draft.slug.trim()) next.slug = "Slug is required.";
    if (!draft.code_prefix.trim()) {
      next.code_prefix = "Code prefix is required.";
    } else if (
      !/^[A-Z0-9]{1,6}$/.test(
        draft.code_prefix.trim().toUpperCase(),
      )
    ) {
      next.code_prefix = "Use 1-6 letters/numbers only.";
    }
    if (productCount > 0 && draft.slug !== category.slug) {
      next.slug =
        "Slug cannot be changed while products use this category.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!validate()) {
        throw new Error("Complete the highlighted category fields.");
      }

      const { error } = await supabase
        .from("categories")
        .update({
          name: draft.name.trim(),
          slug: slugify(draft.slug),
          code_prefix: draft.code_prefix.trim().toUpperCase(),
          sort_order: Number(draft.sort_order || 0),
          active: draft.active,
          image_url: draft.image_url.trim() || null,
          seo_title: draft.seo_title.trim(),
          seo_description: draft.seo_description.trim(),
          og_image: draft.og_image.trim(),
        })
        .eq("slug", category.slug);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category updated.");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update category.",
      ),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (productCount > 0) {
        throw new Error(
          `This category is used by ${productCount} product${
            productCount === 1 ? "" : "s"
          }. Move those products first.`,
        );
      }

      if (
        typeof window !== "undefined" &&
        !window.confirm(`Delete category "${category.name}"?`)
      ) {
        return false;
      }

      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("slug", category.slug);

      if (error) throw error;
      return true;
    },
    onSuccess: (deleted) => {
      if (!deleted) return;
      toast.success("Category deleted.");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not delete category.",
      ),
  });

  return (
    <article className="glass-panel rounded-[24px] p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">
            {category.slug}
          </span>
          <h3 className="mt-2 font-display text-base tracking-[0.14em] text-foreground">
            {category.name}
          </h3>
          <p className="mt-2 text-[9px] text-muted-foreground">
            {productCount} product
            {productCount === 1 ? "" : "s"} - code prefix{" "}
            {category.code_prefix}
          </p>
        </div>

        <span className="rounded-xl border border-border/50 px-3 py-2 text-[8px] uppercase tracking-[0.22em] text-muted-foreground">
          {draft.active ? "Active" : "Hidden"}
        </span>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="mb-5 rounded-2xl border border-red-500/45 bg-red-500/[0.05] p-4">
          {Object.values(errors).map((message) => (
            <p
              key={message}
              className="text-[9px] leading-relaxed text-red-300"
            >
              - {message}
            </p>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *">
          <input
            className={`${adminField} ${
              errors.name ? "border-red-500/80" : ""
            }`}
            value={draft.name}
            onChange={(event) => {
              setErrors((prev) => ({ ...prev, name: "" }));
              setDraft((prev) => ({
                ...prev,
                name: event.target.value,
              }));
            }}
          />
        </Field>

        <Field label="Slug *">
          <input
            className={`${adminField} ${
              errors.slug ? "border-red-500/80" : ""
            }`}
            value={draft.slug}
            disabled={productCount > 0}
            onChange={(event) => {
              setErrors((prev) => ({ ...prev, slug: "" }));
              setDraft((prev) => ({
                ...prev,
                slug: slugify(event.target.value),
              }));
            }}
          />
        </Field>

        <Field label="Code prefix *">
          <input
            className={`${adminField} ${
              errors.code_prefix ? "border-red-500/80" : ""
            }`}
            value={draft.code_prefix}
            maxLength={6}
            onChange={(event) => {
              setErrors((prev) => ({
                ...prev,
                code_prefix: "",
              }));
              setDraft((prev) => ({
                ...prev,
                code_prefix: event.target.value
                  .replace(/[^a-zA-Z0-9]/g, "")
                  .toUpperCase(),
              }));
            }}
          />
        </Field>

        <Field label="Sort order">
          <input
            className={adminField}
            type="number"
            value={draft.sort_order}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                sort_order: event.target.value,
              }))
            }
          />
        </Field>

        <Field label="Category image URL">
          <input
            className={adminField}
            value={draft.image_url}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                image_url: event.target.value,
              }))
            }
          />
        </Field>

        <Field label="OG image URL">
          <input
            className={adminField}
            value={draft.og_image}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                og_image: event.target.value,
              }))
            }
          />
        </Field>
      </div>

      <div className="mt-4 space-y-4">
        <Field label="SEO title">
          <input
            className={adminField}
            value={draft.seo_title}
            maxLength={70}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                seo_title: event.target.value,
              }))
            }
          />
        </Field>

        <Field label="SEO description">
          <textarea
            className={adminField}
            rows={3}
            value={draft.seo_description}
            maxLength={170}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                seo_description: event.target.value,
              }))
            }
          />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Toggle
          label={
            draft.active ? "Active category" : "Hidden category"
          }
          checked={draft.active}
          onChange={(active) =>
            setDraft((prev) => ({ ...prev, active }))
          }
        />
        <AdminButton
          tone="primary"
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Saving..." : "Save changes"}
        </AdminButton>
        <AdminButton
          tone="danger"
          disabled={remove.isPending || productCount > 0}
          onClick={() => remove.mutate()}
        >
          {productCount > 0
            ? "Move products before delete"
            : "Delete category"}
        </AdminButton>
      </div>
    </article>
  );
}
