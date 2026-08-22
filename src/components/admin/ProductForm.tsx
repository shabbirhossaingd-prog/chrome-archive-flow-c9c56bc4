import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAllCategories, useAdminProducts, type Product } from "@/lib/products";
import { adminCollectionsQuery } from "@/lib/cms";
import { STOCK_OPTIONS } from "@/lib/site-config";
import {
  generateProductContent,
  peekProductCode,
  reserveProductCode,
} from "@/lib/admin.functions";
import { ImageUploader } from "./ImageUploader";
import { AdminButton, Field, Toggle, adminField } from "./AdminUI";

type Draft = {
  name: string;
  slug: string;
  category: string;
  price: string;
  old_price: string;
  quantity_available: string;
  stock_status: string;
  short_description: string;
  full_description: string;
  seo_title: string;
  seo_description: string;
  image_alt_text: string;
  material: string;
  finish: string;
  fit_gender: string;
  tags: string;
  size_type: string;
  sizes: string;
  size_description: string;
  size_guide: string;
  details_content: string;
  material_content: string;
  care: string;
  delivery: string;
  collection_id: string;
  related_product_ids: string[];
  featured: boolean;
  new_collection: boolean;
  archived: boolean;
  published: boolean;
  whatsapp_available: boolean;
  primary_image: string;
  gallery_images: string[];
  sort_order: string;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const csv = (arr: string[] | null | undefined) => (arr ?? []).join(", ");
const fromCsv = (s: string) =>
  s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

function toDraft(p?: Product): Draft {
  return {
    name: p?.name ?? "",
    slug: p?.slug ?? "",
    category: p?.category ?? "",
    price: p ? String(p.price) : "",
    old_price: p?.old_price != null ? String(p.old_price) : "",
    quantity_available: p ? String(p.quantity_available) : "1",
    stock_status: p?.stock_status ?? "IN STOCK",
    short_description: p?.short_description ?? "",
    full_description: p?.full_description ?? "",
    seo_title: (p as any)?.seo_title ?? "",
    seo_description: (p as any)?.seo_description ?? "",
    image_alt_text: (p as any)?.image_alt_text ?? "",
    material: p?.material ?? "",
    finish: csv(p?.finish),
    fit_gender: p?.fit_gender ?? "UNISEX",
    tags: csv(p?.tags),
    size_type: p?.size_type ?? "ONE SIZE",
    sizes: csv(p?.sizes),
    size_description: p?.size_description ?? "",
    size_guide: p?.size_guide ?? "",
    details_content: p?.details_content ?? "",
    material_content: p?.material_content ?? "",
    care: p?.care ?? "",
    delivery: p?.delivery ?? "",
    collection_id: p?.collection_id ?? "",
    related_product_ids: p?.related_product_ids ?? [],
    featured: p?.featured ?? false,
    new_collection: p?.new_collection ?? false,
    archived: p?.archived ?? false,
    published: p?.published ?? false,
    whatsapp_available: p?.whatsapp_available ?? true,
    primary_image: p?.primary_image ?? "",
    gallery_images: p?.gallery_images ?? [],
    sort_order: p ? String(p.sort_order) : "0",
  };
}

async function uniqueSlug(base: string, currentId?: string) {
  const clean = slugify(base) || `object-${Date.now()}`;
  for (let i = 0; i < 100; i += 1) {
    const candidate = i === 0 ? clean : `${clean}-${i + 1}`;
    let q = supabase.from("products").select("id").eq("slug", candidate).limit(1);
    if (currentId) q = q.neq("id", currentId);
    const { data, error } = await q;
    if (error) throw error;
    if (!data?.length) return candidate;
  }
  return `${clean}-${crypto.randomUUID().slice(0, 8)}`;
}

export function ProductForm({ product }: { product?: Product }) {
  const [d, setD] = useState<Draft>(() => toDraft(product));
  const [dirty, setDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [aiBusy, setAiBusy] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: categories = [] } = useAllCategories();
  const { data: products = [] } = useAdminProducts();
  const { data: collections = [] } = useQuery(adminCollectionsQuery);
  const reserveCode = useServerFn(reserveProductCode);
  const previewCode = useServerFn(peekProductCode);
  const generateCopy = useServerFn(generateProductContent);

  const { data: codePreview, isFetching: codeLoading } = useQuery({
    queryKey: ["product-code-preview", d.category],
    enabled: !product && !!d.category,
    queryFn: () => previewCode({ data: { category: d.category } }),
  });

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const clearFieldError = (key: string) => {
    setValidationErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const fieldClass = (key: string) =>
    `${adminField} ${
      validationErrors[key]
        ? "border-red-500/80 focus:border-red-500"
        : ""
    }`;

  const errorText = (key: string) =>
    validationErrors[key] ? (
      <p className="mt-2 text-[9px] leading-relaxed text-red-400">
        {validationErrors[key]}
      </p>
    ) : null;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    clearFieldError(String(key));
    setDirty(true);
    setD((prev) => ({ ...prev, [key]: value }));
  };

  const selectedCollection = useMemo(
    () => collections.find((c) => c.id === d.collection_id) ?? null,
    [collections, d.collection_id],
  );

  const relatedCandidates = products.filter((p) => p.id !== product?.id);

  const validate = (publish: boolean) => {
    const errors: Record<string, string> = {};

    if (!d.name.trim()) errors.name = "Product name is required.";
    if (!d.category) errors.category = "Category is required.";

    if (publish) {
      if (!d.price.trim() || Number(d.price) <= 0) {
        errors.price = "Enter a valid product price.";
      }
      if (!d.short_description.trim()) {
        errors.short_description = "Short description is required.";
      }
      if (!d.full_description.trim()) {
        errors.full_description = "Full description is required.";
      }
      if (!d.material.trim()) {
        errors.material = "Material is required. Use 'Unknown / not confirmed' if necessary.";
      }
      if (!d.finish.trim()) {
        errors.finish = "Finish / color is required.";
      }
      if (d.quantity_available.trim() === "" || Number(d.quantity_available) < 0) {
        errors.quantity_available = "Enter a valid stock quantity.";
      }
      if (d.size_type !== "ONE SIZE" && !d.sizes.trim()) {
        errors.sizes = "Add available sizes for this size type.";
      }
      if (!d.primary_image) {
        errors.primary_image = "Main product image is required before publishing.";
      }
      if (!d.seo_title.trim()) {
        errors.seo_title = "SEO title is required.";
      }
      if (!d.seo_description.trim()) {
        errors.seo_description = "Meta description is required.";
      }
      if (!d.image_alt_text.trim()) {
        errors.image_alt_text = "Main image ALT text is required.";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generateWithAi = async () => {
    const errors: Record<string, string> = {};
    if (!d.name.trim()) errors.name = "Enter the product name before using AI.";
    if (!d.category) errors.category = "Select the category before using AI.";

    if (Object.keys(errors).length) {
      setValidationErrors((prev) => ({ ...prev, ...errors }));
      toast.error("Add product name and category first.");
      return;
    }

    setAiBusy(true);
    try {
      const result = await generateCopy({
        data: {
name: d.name,
category: d.category,
material: d.material,
finish: d.finish,
fit_gender: d.fit_gender,
sizes: d.sizes,
size_description: d.size_description,
existing_description: d.full_description,
        },
      });

      setDirty(true);
      setD((prev) => ({
        ...prev,
        slug: result.slug ? slugify(result.slug) : prev.slug || slugify(prev.name),
        short_description: result.short_description,
        full_description: result.full_description,
        tags: result.tags.join(", "),
        details_content: result.details_content,
        material_content: result.material_content,
        care: result.care,
        seo_title: result.seo_title,
        seo_description: result.seo_description,
        image_alt_text: result.image_alt_text,
      }));
      setValidationErrors({});
      toast.success("AI content generated. Review and edit it before publishing.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not generate product content.",
      );
    } finally {
      setAiBusy(false);
    }
  };

  const save = useMutation({
    mutationFn: async ({ publish }: { publish: boolean }) => {
      if (!validate(publish)) {
        throw new Error(
publish
  ? "Complete the highlighted required fields before publishing."
  : "Product name and category are required to save a draft.",
        );
      }

      const qty = Math.max(0, Number(d.quantity_available || 0));
      const status = qty <= 0 ? "SOLD OUT" : d.stock_status;
      const slug = await uniqueSlug(d.slug.trim() || d.name, product?.id);

      const payload = {
        name: d.name.trim(),
        slug,
        category: d.category,
        price: Math.max(0, Number(d.price || 0)),
        old_price: d.old_price ? Math.max(0, Number(d.old_price)) : null,
        quantity_available: qty,
        stock_status: status,
        short_description: d.short_description,
        full_description: d.full_description,
        seo_title: d.seo_title,
        seo_description: d.seo_description,
        image_alt_text: d.image_alt_text,
        material: d.material,
        finish: fromCsv(d.finish),
        fit_gender: d.fit_gender,
        tags: fromCsv(d.tags),
        size_type: d.size_type,
        sizes: fromCsv(d.sizes),
        size_description: d.size_description,
        size_guide: d.size_guide,
        details_content: d.details_content,
        material_content: d.material_content,
        care: d.care,
        delivery: d.delivery,
        collection_id: d.collection_id || null,
        collection_name: selectedCollection
          ? `DROP ${String(selectedCollection.drop_number).padStart(3, "0")} — ${selectedCollection.name}`
          : "",
        related_product_ids: d.related_product_ids.slice(0, 2),
        featured: d.featured,
        new_collection: d.new_collection,
        archived: d.archived,
        published: publish,
        whatsapp_available: d.whatsapp_available,
        primary_image: d.primary_image,
        gallery_images: d.gallery_images.slice(0, 5),
        sort_order: Number(d.sort_order || 0),
      };

      if (product) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
        return { code: product.product_code, publish, slug };
      }

      const { code } = await reserveCode({ data: { category: d.category } });
      const { error } = await supabase.from("products").insert({
        ...payload,
        product_code: code,
      });
      if (error) throw error;
      return { code, publish, slug };
    },
    onSuccess: ({ code, publish }) => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(
        publish ? `Object Published Successfully — ${code}` : `Draft saved — ${code}`,
      );
      navigate({ to: "/admin/products" });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save object"),
  });

  const toggleRelated = (id: string) => {
    if (d.related_product_ids.includes(id)) {
      set("related_product_ids", d.related_product_ids.filter((v) => v !== id));
      return;
    }
    if (d.related_product_ids.length >= 2) {
      toast.error("Select up to 2 related objects");
      return;
    }
    set("related_product_ids", [...d.related_product_ids, id]);
  };

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="space-y-8 pb-20"
    >
      <div className="glass-panel rounded-[24px] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
              PRODUCT CODE
            </span>
            <p className="mt-2 font-display text-lg tracking-[0.18em] text-foreground">
              {product?.product_code ||
                (d.category
                  ? codeLoading
                    ? "Checking…"
                    : codePreview?.code ?? "Generated automatically"
                  : "Select a category")}
            </p>
          </div>
          <div className="sm:text-right">
            <span className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
              STATUS
            </span>
            <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-chrome">
              {product?.published ? "Published" : "Draft"}
            </p>
          </div>
        </div>
      </div>      <section className="glass-panel space-y-5 rounded-[24px] p-6">
        <div>
<h2 className="font-display text-sm tracking-[0.22em] text-foreground">
  AI CONTENT + SEO
</h2>
<p className="mt-3 max-w-3xl text-[10px] leading-relaxed text-muted-foreground">
  Generate product copy and SEO from the facts you entered. AI never publishes automatically.
  Review every generated field and edit anything you want.
</p>
        </div>
        <AdminButton
tone="primary"
disabled={aiBusy}
onClick={() => void generateWithAi()}
        >
{aiBusy ? "Generating…" : "Generate with Gemini AI"}
        </AdminButton>
      </section>

      {Object.keys(validationErrors).length > 0 && (
        <section className="rounded-[22px] border border-red-500/45 bg-red-500/[0.06] p-5">
<p className="text-[9px] uppercase tracking-[0.32em] text-red-300">
  Required information missing
</p>
<ul className="mt-3 space-y-1 text-[10px] leading-relaxed text-red-200/90">
  {Object.values(validationErrors).map((message) => (
    <li key={message}>• {message}</li>
  ))}
</ul>
        </section>
      )}

      <section className="glass-panel space-y-6 rounded-[24px] p-6">
        <h2 className="font-display text-sm tracking-[0.22em] text-foreground">
BASIC INFORMATION
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Product name *">
            <input
              className={fieldClass("name")}
              value={d.name}              onChange={(e) => {
      const name = e.target.value;
      clearFieldError("name");
      setDirty(true);
                setD((prev) => ({
                  ...prev,
                  name,
                  slug: product ? prev.slug : slugify(name),
                }));
              }}
            />
          </Field>
          <Field label="Slug / URL">
            <input
              className={adminField}
              value={d.slug}
              onChange={(e) => set("slug", slugify(e.target.value))}
            />
          </Field>
          <Field label="Category *">
            <select
              className={fieldClass("category")}
              value={d.category}
              onChange={(e) => set("category", e.target.value)}
            >
              <option value="">SELECT…</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name} ({c.code_prefix})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Collection">
            <select
              className={adminField}
              value={d.collection_id}
              onChange={(e) => set("collection_id", e.target.value)}
            >
              <option value="">NO COLLECTION</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  DROP {String(c.drop_number).padStart(3, "0")} — {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Price *">
            <input
              className={fieldClass("price")}
              type="number"
              min={0}
              value={d.price}
              onChange={(e) => set("price", e.target.value)}
            />
          </Field>
          <Field label="Old price (optional)">
            <input
              className={adminField}
              type="number"
              min={0}
              value={d.old_price}
              onChange={(e) => set("old_price", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Short description *">
          <textarea
            className={fieldClass("short_description")}
            rows={2}
            value={d.short_description}
            onChange={(e) => set("short_description", e.target.value)}
          />
        </Field>
        <Field label="Full description *">
          <textarea
            className={fieldClass("full_description")}
            rows={5}
            value={d.full_description}
            onChange={(e) => set("full_description", e.target.value)}
          />
        </Field>
      </section>

      <section className="glass-panel space-y-6 rounded-[24px] p-6">
        <h2 className="font-display text-sm tracking-[0.22em] text-foreground">
          PRODUCT ATTRIBUTES
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Material *">
            <input
              className={fieldClass("material")}
              value={d.material}
              onChange={(e) => set("material", e.target.value)}
            />
          </Field>
          <Field label="Finish / color (comma separated) *">
            <input
              className={fieldClass("finish")}
              value={d.finish}
              onChange={(e) => set("finish", e.target.value)}
              placeholder="CHROME, GUNMETAL"
            />
          </Field>
          <Field label="Fit / gender">
            <input
              className={adminField}
              value={d.fit_gender}
              onChange={(e) => set("fit_gender", e.target.value)}
              placeholder="UNISEX"
            />
          </Field>
          <Field label="Tags (comma separated)">
            <input
              className={adminField}
              value={d.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="gothic, chrome, y2k"
            />
          </Field>
        </div>
      </section>

      <section className="glass-panel space-y-6 rounded-[24px] p-6">
        <h2 className="font-display text-sm tracking-[0.22em] text-foreground">SIZE</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Size type">
            <select
              className={adminField}
              value={d.size_type}
              onChange={(e) => set("size_type", e.target.value)}
            >
              {["ADJUSTABLE", "FIXED", "ONE SIZE", "MULTIPLE SIZES", "CUSTOM"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Available sizes (comma separated)">
            <input
              className={fieldClass("sizes")}
              value={d.sizes}
              onChange={(e) => set("sizes", e.target.value)}
              placeholder="6, 7, 8, 9 or S, M, L"
            />
          </Field>
        </div>
        <Field label="Size description">
          <textarea
            className={adminField}
            rows={2}
            value={d.size_description}
            onChange={(e) => set("size_description", e.target.value)}
          />
        </Field>
        <Field label="Size guide">
          <textarea
            className={adminField}
            rows={4}
            value={d.size_guide}
            onChange={(e) => set("size_guide", e.target.value)}
          />
        </Field>
      </section>

      <section className="glass-panel space-y-6 rounded-[24px] p-6">
        <h2 className="font-display text-sm tracking-[0.22em] text-foreground">STOCK</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Quantity available *">
            <input
              className={fieldClass("quantity_available")}
              type="number"
              min={0}
              value={d.quantity_available}
              onChange={(e) => {
                const value = e.target.value;
                setDirty(true);
                setD((prev) => ({
                  ...prev,
                  quantity_available: value,
                  stock_status: Number(value || 0) <= 0 ? "SOLD OUT" : prev.stock_status,
                }));
              }}
            />
          </Field>
          <Field label="Stock status">
            <select
              className={adminField}
              value={d.stock_status}
              onChange={(e) => set("stock_status", e.target.value)}
            >
              {STOCK_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="glass-panel space-y-6 rounded-[24px] p-6">
        <h2 className="font-display text-sm tracking-[0.22em] text-foreground">
          PRODUCT ACCORDIONS
        </h2>
        <Field label="Details content">
          <textarea
            className={adminField}
            rows={4}
            value={d.details_content}
            onChange={(e) => set("details_content", e.target.value)}
          />
        </Field>
        <Field label="Material content">
          <textarea
            className={adminField}
            rows={4}
            value={d.material_content}
            onChange={(e) => set("material_content", e.target.value)}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Care content">
            <textarea
              className={adminField}
              rows={4}
              value={d.care}
              onChange={(e) => set("care", e.target.value)}
            />
          </Field>
          <Field label="Delivery content">
            <textarea
              className={adminField}
              rows={4}
              value={d.delivery}
              onChange={(e) => set("delivery", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="glass-panel space-y-6 rounded-[24px] p-6">
        <div>
<h2 className="font-display text-sm tracking-[0.22em] text-foreground">
  SEARCH / SEO
</h2>
<p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
  Gemini can fill these fields, but they remain fully editable. These values are used on the public product page.
</p>
        </div>

        <Field label="SEO title *">
<input
  className={fieldClass("seo_title")}
  value={d.seo_title}
  maxLength={70}
  onChange={(e) => set("seo_title", e.target.value)}
  placeholder="Product search title"
/>
{errorText("seo_title")}
        </Field>

        <Field label="Meta description *">
<textarea
  className={fieldClass("seo_description")}
  rows={3}
  value={d.seo_description}
  maxLength={170}
  onChange={(e) => set("seo_description", e.target.value)}
  placeholder="Search result description"
/>
{errorText("seo_description")}
        </Field>

        <Field label="Main image ALT text *">
<input
  className={fieldClass("image_alt_text")}
  value={d.image_alt_text}
  maxLength={140}
  onChange={(e) => set("image_alt_text", e.target.value)}
  placeholder="Accessible description of the main product image"
/>
{errorText("image_alt_text")}
        </Field>
      </section>

      <section className="glass-panel space-y-7 rounded-[24px] p-6">
        <h2 className="font-display text-sm tracking-[0.22em] text-foreground">IMAGES</h2>        <ImageUploader
label="Main image *"
max={1}
value={d.primary_image ? [d.primary_image] : []}
onChange={(next) => set("primary_image", next[0] ?? "")}
        />
        {errorText("primary_image")}
        <ImageUploader
          label="Gallery"
          max={5}
          value={d.gallery_images}
          onChange={(next) => set("gallery_images", next)}
        />
      </section>

      <section className="glass-panel space-y-5 rounded-[24px] p-6">
        <h2 className="font-display text-sm tracking-[0.22em] text-foreground">
          RELATED OBJECTS
        </h2>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Select up to 2 manual recommendations. Leave empty to allow the public product page to
          use automatic recommendations.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {relatedCandidates.map((p) => {
            const active = d.related_product_ids.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleRelated(p.id)}
                className={`rounded-xl border p-3 text-left ${
                  active
                    ? "border-chrome/70 bg-white/[0.05]"
                    : "border-border/50"
                }`}
              >
                <span className="block text-[8px] tracking-[0.3em] text-muted-foreground">
                  {p.product_code}
                </span>
                <span className="mt-1 block text-[9px] uppercase tracking-[0.2em] text-foreground">
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="glass-panel space-y-5 rounded-[24px] p-6">
        <h2 className="font-display text-sm tracking-[0.22em] text-foreground">VISIBILITY</h2>
        <div className="flex flex-wrap gap-3">
          <Toggle
            label="Featured Product"
            checked={d.featured}
            onChange={(v) => set("featured", v)}
          />
          <Toggle
            label="New collection"
            checked={d.new_collection}
            onChange={(v) => set("new_collection", v)}
          />
          <Toggle label="Archived" checked={d.archived} onChange={(v) => set("archived", v)} />
          <Toggle
            label="WhatsApp order"
            checked={d.whatsapp_available}
            onChange={(v) => set("whatsapp_available", v)}
          />
        </div>
        <Field label="Sort order">
          <input
            className={adminField}
            type="number"
            value={d.sort_order}
            onChange={(e) => set("sort_order", e.target.value)}
          />
        </Field>
      </section>

      <div className="sticky bottom-3 z-20 flex flex-wrap gap-3 rounded-2xl border border-border/60 bg-black/80 p-3 backdrop-blur-xl">
        <AdminButton
          tone="primary"
          disabled={save.isPending}
          onClick={() => save.mutate({ publish: false })}
        >
          {save.isPending ? "Saving…" : "Save draft"}
        </AdminButton>
        <AdminButton
          tone="primary"
          disabled={save.isPending}
          onClick={() => save.mutate({ publish: true })}
        >
          {save.isPending ? "Publishing…" : product ? "Save & publish" : "Publish object"}
        </AdminButton>
        <AdminButton
          onClick={() => {
            if (!dirty || confirm("Discard unsaved changes?")) {
              setDirty(false);
              navigate({ to: "/admin/products" });
            }
          }}
        >
          Cancel
        </AdminButton>
      </div>
    </form>
  );
}
