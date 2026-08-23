import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Collection = Database["public"]["Tables"]["collections"]["Row"];
export type Page = Database["public"]["Tables"]["pages"]["Row"];
export type BlogPost = Database["public"]["Tables"]["blog_posts"]["Row"];

export type PageKey = "shop" | "collection" | "archive" | "about";

/* ---------------- PAGES ---------------- */

export const pagesQuery = queryOptions({
  queryKey: ["pages"],
  queryFn: async (): Promise<Page[]> => {
    const { data, error } = await supabase.from("pages").select("*").order("page_key");
    if (error) throw error;
    return data ?? [];
  },
});

export function usePages() {
  return useQuery(pagesQuery);
}

/** One editable public page by key, with the whole list cached once. */
export function usePage(key: PageKey) {
  const q = useQuery(pagesQuery);
  return { ...q, page: (q.data ?? []).find((p) => p.page_key === key) ?? null };
}

export function pageJson<T = Record<string, unknown>>(page: Page | null): T {
  return (page?.content_json ?? {}) as T;
}

/* ---------------- COLLECTIONS ---------------- */

const collectionSelect = () =>
  supabase.from("collections").select("*").order("drop_number", { ascending: false });

export const currentCollectionQuery = queryOptions({
  queryKey: ["collections", "current"],
  queryFn: async (): Promise<Collection | null> => {
    const { data, error } = await supabase
      .from("collections")
      .select("*")
      .eq("published", true)
      .eq("is_current", true)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const archivedCollectionsQuery = queryOptions({
  queryKey: ["collections", "archived"],
  queryFn: async (): Promise<Collection[]> => {
    const { data, error } = await collectionSelect().eq("published", true).eq("archived", true);
    if (error) throw error;
    return data ?? [];
  },
});

export const publishedCollectionsQuery = queryOptions({
  queryKey: ["collections", "published"],
  queryFn: async (): Promise<Collection[]> => {
    const { data, error } = await collectionSelect().eq("published", true);
    if (error) throw error;
    return data ?? [];
  },
});

export const adminCollectionsQuery = queryOptions({
  queryKey: ["collections", "admin"],
  queryFn: async (): Promise<Collection[]> => {
    const { data, error } = await collectionSelect();
    if (error) throw error;
    return data ?? [];
  },
});

export const useCurrentCollection = (enabled = true) =>
  useQuery({ ...currentCollectionQuery, enabled });
export const useArchivedCollections = () => useQuery(archivedCollectionsQuery);
export const usePublishedCollections = () => useQuery(publishedCollectionsQuery);
export const useAdminCollections = () => useQuery(adminCollectionsQuery);

export function collectionBySlugQuery(slug: string) {
  return queryOptions({
    queryKey: ["collections", "slug", slug],
    queryFn: async (): Promise<Collection | null> => {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/* ---------------- BLOG ---------------- */

export const publishedPostsQuery = queryOptions({
  queryKey: ["blog", "published"],
  queryFn: async (): Promise<BlogPost[]> => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const adminPostsQuery = queryOptions({
  queryKey: ["blog", "admin"],
  queryFn: async (): Promise<BlogPost[]> => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const usePublishedPosts = () => useQuery(publishedPostsQuery);
export const useAdminPosts = () => useQuery(adminPostsQuery);

export function postBySlugQuery(slug: string) {
  return queryOptions({
    queryKey: ["blog", "slug", slug],
    queryFn: async (): Promise<BlogPost | null> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/* ---------------- SHARED HELPERS ---------------- */

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso)
        .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        .toUpperCase()
    : "";
