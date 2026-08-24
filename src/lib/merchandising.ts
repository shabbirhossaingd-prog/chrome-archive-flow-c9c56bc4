import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MerchSectionType = "manual" | "category" | "new" | "featured" | "sale";

export type HomepageMerchSection = {
  id: string;
  internal_name: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  section_type: MerchSectionType;
  category_slug: string;
  product_ids: string[];
  limit_count: number;
  button_label: string;
  button_href: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

async function fetchSections(admin: boolean): Promise<HomepageMerchSection[]> {
  let query = (supabase as any)
    .from("homepage_merch_sections")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (!admin) query = query.eq("active", true);
  const { data, error } = await query;

  if (error) {
    const message = String(error.message || "").toLowerCase();
    if (message.includes("homepage_merch_sections")) return [];
    throw error;
  }

  return (data ?? []) as HomepageMerchSection[];
}

export const homepageMerchQuery = queryOptions({
  queryKey: ["homepage-merch", "live"],
  staleTime: 60_000,
  queryFn: () => fetchSections(false),
});

export const adminHomepageMerchQuery = queryOptions({
  queryKey: ["homepage-merch", "admin"],
  queryFn: () => fetchSections(true),
});

export function useHomepageMerch(enabled = true) {
  return useQuery({ ...homepageMerchQuery, enabled });
}

export function useAdminHomepageMerch() {
  return useQuery(adminHomepageMerchQuery);
}
