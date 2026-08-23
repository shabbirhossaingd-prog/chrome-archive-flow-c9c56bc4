import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HomepageBanner = {
  id: string;
  internal_name: string;
  image_url: string;
  headline: string;
  offer_text: string;
  button_label: string;
  button_href: string;
  full_link: string;
  style: "chrome-frame" | "system-alert" | "editorial-dark";
  text_position: "left" | "center" | "right";
  overlay_strength: "none" | "light" | "medium" | "dark";
  image_only: boolean;
  show_button: boolean;
  show_countdown: boolean;
  active: boolean;
  start_at: string | null;
  end_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const homepageBannersQuery = queryOptions({
  queryKey: ["homepage-banners", "live"],
  staleTime: 60_000,
  queryFn: async (): Promise<HomepageBanner[]> => {
    const { data, error } = await (supabase as any)
      .from("homepage_banners")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      // The storefront should stay usable before the migration is applied.
      if (String(error.message || "").toLowerCase().includes("homepage_banners")) return [];
      throw error;
    }

    return (data ?? []) as HomepageBanner[];
  },
});

export function useHomepageBanners(enabled = true) {
  return useQuery({ ...homepageBannersQuery, enabled });
}
