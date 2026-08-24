import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HomepageArchiveVisual = {
  id: number;
  title: string;
  series_label: string;
  active: boolean;
  left_image: string;
  left_alt: string;
  left_link: string;
  top_right_image: string;
  top_right_alt: string;
  top_right_link: string;
  bottom_right_image: string;
  bottom_right_alt: string;
  bottom_right_link: string;
  created_at?: string;
  updated_at?: string;
};

export const homepageArchiveVisualQuery = queryOptions({
  queryKey: ["homepage-archive-visual"],
  staleTime: 60_000,
  queryFn: async (): Promise<HomepageArchiveVisual | null> => {
    const { data, error } = await (supabase as any)
      .from("homepage_archive_visual")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      const message = String(error.message || "").toLowerCase();
      if (message.includes("homepage_archive_visual")) return null;
      throw error;
    }

    return (data ?? null) as HomepageArchiveVisual | null;
  },
});

export function useHomepageArchiveVisual(enabled = true) {
  return useQuery({ ...homepageArchiveVisualQuery, enabled });
}
