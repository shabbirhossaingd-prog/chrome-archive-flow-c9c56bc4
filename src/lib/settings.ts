import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SITE, formatPrice, whatsappUrl } from "./site-config";

export type SiteSettings = Database["public"]["Tables"]["site_settings"]["Row"];

export const settingsQuery = queryOptions({
  queryKey: ["site-settings"],
  staleTime: 1000 * 60 * 5,
  queryFn: async (): Promise<SiteSettings | null> => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

/** Central access to the brand's business settings, with safe fallbacks. */
export function useSite(enabled = true) {
  const { data } = useQuery({ ...settingsQuery, enabled });

  const brand = data?.brand_name || SITE.brand;
  const whatsappNumber = (data?.whatsapp_number || SITE.whatsappNumber).replace(/\D/g, "");
  const instagramUrl = data?.instagram_url || SITE.instagramUrl;
  const email = data?.email || SITE.email;
  const location = data?.location || SITE.location;
  const currencySymbol = data?.currency_symbol || SITE.currencySymbol;
  const currencyCode = data?.currency_code || SITE.currencyCode;

  return {
    settings: data ?? null,
    brand,
    tagline: SITE.tagline,
    delivery: SITE.delivery,
    instagramUrl,
    instagramHandle: SITE.instagramHandle,
    email,
    emailHref: `mailto:${email}`,
    location,
    whatsappNumber,
    whatsappDisplay: `+${whatsappNumber}`,
    whatsappHref: `https://wa.me/${whatsappNumber}`,
    currencySymbol,
    currencyCode,
    wa: (text: string) => whatsappUrl(text, whatsappNumber),
    price: (n: number | string) => formatPrice(n, currencySymbol),
  };
}
