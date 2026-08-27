import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];

const PUBLIC_PRODUCT_FIELDS = [
  "id",
  "slug",
  "name",
  "product_code",
  "category",
  "collection_id",
  "collection_name",
  "material",
  "primary_image",
  "price",
  "old_price",
  "stock_status",
  "quantity_available",
  "sort_order",
  "created_at",
  "new_collection",
  "featured",
  "published",
  "archived",
  "short_description",
  "tags",
].join(",");

const ORDER = (q: any) =>
  q.order("sort_order", { ascending: true }).order("created_at", { ascending: false });

const buildSelect = () => supabase.from("products").select("*");
const buildPublicSelect = () =>
  supabase.from("products").select(PUBLIC_PRODUCT_FIELDS);

/** Temporary store mode: every customer-facing object is available as PRE-ORDER. */
export const FORCE_ALL_PRODUCTS_PREORDER = true;

/** Published, non-archived objects — lightweight payload for public cards/lists. */
export const productsQuery = queryOptions({
  queryKey: ["products", "public"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await ORDER(
      buildPublicSelect().eq("published", true).eq("archived", false),
    );
    if (error) throw error;
    return (data ?? []) as unknown as Product[];
  },
});

/** Published archive objects. */
export const archivedProductsQuery = queryOptions({
  queryKey: ["products", "archived"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await ORDER(
      buildSelect().eq("published", true).eq("archived", true),
    );
    if (error) throw error;
    return data ?? [];
  },
});

/** Every published object (shop + archive). */
export const allPublishedProductsQuery = queryOptions({
  queryKey: ["products", "all-published"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await ORDER(buildSelect().eq("published", true));
    if (error) throw error;
    return data ?? [];
  },
});

/** One full published object — product pages should not fetch the whole catalogue. */
export const productBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["products", "public", "slug", slug],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("published", true)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

/** Admin view: drafts included. Requires an admin session (enforced by RLS). */
export const adminProductsQuery = queryOptions({
  queryKey: ["products", "admin"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories", "active"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export const allCategoriesQuery = queryOptions({
  queryKey: ["categories", "all"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export function useProducts(enabled = true) {
  return useQuery({ ...productsQuery, enabled });
}

export function useProductBySlug(slug: string) {
  return useQuery(productBySlugQuery(slug));
}

export function useAllPublishedProducts() {
  return useQuery(allPublishedProductsQuery);
}

export function useArchivedProducts() {
  return useQuery(archivedProductsQuery);
}

export function useAdminProducts() {
  return useQuery(adminProductsQuery);
}

export function useCategories(enabled = true) {
  return useQuery({ ...categoriesQuery, enabled });
}

export function useAllCategories() {
  return useQuery(allCategoriesQuery);
}

export const isPreorder = (p: Product) =>
  FORCE_ALL_PRODUCTS_PREORDER || p.stock_status === "PRE-ORDER";

export const isSoldOut = (p: Product) =>
  !isPreorder(p) &&
  (p.stock_status === "SOLD OUT" || Number(p.quantity_available ?? 0) <= 0);

/** Customer-facing stock wording. Never exposes exact inventory. */
export function customerStockLabel(p: Product) {
  if (isPreorder(p)) return "PRE-ORDER";
  if (isSoldOut(p)) return "SOLD OUT";
  if (p.stock_status === "LOW STOCK") return "LOW STOCK";
  return "IN STOCK";
}

export function productBadges(p: Product) {
  const badges: string[] = [];
  const stock = customerStockLabel(p);
  if (stock !== "IN STOCK") badges.push(stock);

  const price = Number(p.price ?? 0);
  const oldPrice = Number(p.old_price ?? 0);
  if (oldPrice > price && price > 0) badges.push("SALE");
  if (p.new_collection) badges.push("NEW");
  if (p.featured && !badges.includes("NEW")) badges.push("FEATURED");

  return badges.slice(0, 2);
}

export function productImages(p: Product) {
  return [p.primary_image, ...(p.gallery_images ?? [])].filter(Boolean);
}

export function matchesSearch(p: Product, q: string) {
  const needle = q.trim().toLowerCase().replace(/[\s/-]/g, "");
  if (!needle) return false;
  return [
    p.name,
    p.product_code,
    p.category,
    p.collection_name,
    p.material,
    ...(p.tags ?? []),
  ]
    .join(" ")
    .toLowerCase()
    .replace(/[\s/-]/g, "")
    .includes(needle);
}

export const prettyCategory = (slug: string) =>
  slug.replace(/-/g, " ").toUpperCase();

export { formatPrice, SITE } from "./site-config";
