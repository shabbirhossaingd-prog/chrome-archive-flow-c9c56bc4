import { createFileRoute } from "@tanstack/react-router";

const FALLBACK_SITE_URL = "https://zzerkoff.vercel.app";
const normalizeSiteUrl = (value: string) => value.replace(/\/+$/, "");

const STATIC_URLS = [
  "",
  "/shop",
  "/shop/rings",
  "/shop/bracelets",
  "/shop/chains",
  "/shop/earrings",
  "/shop/eyewear",
  "/shop/watches",
  "/collection",
  "/archive",
  "/blog",
  "/bundles",
  "/shop-the-look",
  "/size-guide",
  "/care-guide",
  "/about",
  "/contact",
  "/faq",
  "/shipping",
  "/returns",
  "/privacy",
  "/terms",
];

export const Route = createFileRoute("/sitemap.txt")({
  server: {
    handlers: {
      GET: async () => {
        const siteUrl = normalizeSiteUrl(
          process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? process.env.SITE_URL || `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
            : FALLBACK_SITE_URL,
        );

        const urls = new Set(STATIC_URLS.map((path) => `${siteUrl}${path}`));

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const [productsResult, postsResult, categoriesResult, collectionsResult] = await Promise.all([
            supabaseAdmin
              .from("products")
              .select("slug")
              .eq("published", true)
              .eq("archived", false),
            supabaseAdmin
              .from("blog_posts")
              .select("slug")
              .eq("status", "published"),
            supabaseAdmin
              .from("categories")
              .select("slug")
              .eq("active", true),
            supabaseAdmin
              .from("collections")
              .select("slug,archived")
              .eq("published", true),
          ]);

          for (const product of productsResult.data ?? []) {
            urls.add(`${siteUrl}/product/${encodeURIComponent(product.slug)}`);
          }
          for (const post of postsResult.data ?? []) {
            urls.add(`${siteUrl}/blog/${encodeURIComponent(post.slug)}`);
          }
          for (const category of categoriesResult.data ?? []) {
            urls.add(`${siteUrl}/shop/${encodeURIComponent(category.slug)}`);
          }
          for (const collection of collectionsResult.data ?? []) {
            if (!collection.archived) continue;
            urls.add(`${siteUrl}/archive/${encodeURIComponent(collection.slug)}`);
          }
        } catch (error) {
          console.error("[sitemap.txt] dynamic URL generation failed", error);
        }

        return new Response(`${Array.from(urls).join("\n")}\n`, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      },
    },
  },
});
