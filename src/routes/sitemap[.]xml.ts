import { createFileRoute } from "@tanstack/react-router";

const FALLBACK_SITE_URL = "https://zzerkoff.vercel.app";

const xmlEscape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");

const normalizeSiteUrl = (value: string) => value.replace(/\/+$/, "");

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const siteUrl = normalizeSiteUrl(
          process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? process.env.SITE_URL || `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
            : FALLBACK_SITE_URL,
        );

        const staticUrls = [
          "",
          "/shop",
          "/collection",
          "/archive",
          "/blog",
          "/bundles",
          "/shop-the-look",
          "/wishlist",
          "/cart",
          "/track-order",
          "/size-guide",
          "/care-guide",
          "/about",
          "/contact",
          "/faq",
          "/shipping",
          "/returns",
          "/privacy",
          "/terms",
        ].map((path) => ({ path, lastmod: null as string | null, priority: path === "" ? 1 : 0.8 }));

        const dynamicUrls: Array<{ path: string; lastmod: string | null; priority: number }> = [];

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const [productsResult, postsResult, categoriesResult, collectionsResult] = await Promise.all([
            supabaseAdmin
              .from("products")
              .select("slug,updated_at")
              .eq("published", true)
              .eq("archived", false),
            supabaseAdmin
              .from("blog_posts")
              .select("slug,updated_at")
              .eq("status", "published"),
            supabaseAdmin
              .from("categories")
              .select("slug,created_at")
              .eq("active", true),
            supabaseAdmin
              .from("collections")
              .select("slug,updated_at,archived")
              .eq("published", true),
          ]);

          for (const product of productsResult.data ?? []) {
            dynamicUrls.push({
              path: `/product/${encodeURIComponent(product.slug)}`,
              lastmod: product.updated_at,
              priority: 0.9,
            });
          }

          for (const post of postsResult.data ?? []) {
            dynamicUrls.push({
              path: `/blog/${encodeURIComponent(post.slug)}`,
              lastmod: post.updated_at,
              priority: 0.75,
            });
          }

          for (const category of categoriesResult.data ?? []) {
            dynamicUrls.push({
              path: `/shop/${encodeURIComponent(category.slug)}`,
              lastmod: category.created_at,
              priority: 0.8,
            });
          }

          for (const collection of collectionsResult.data ?? []) {
            if (!collection.archived) continue;
            dynamicUrls.push({
              path: `/archive/${encodeURIComponent(collection.slug)}`,
              lastmod: collection.updated_at,
              priority: 0.7,
            });
          }
        } catch (error) {
          console.error("[sitemap] dynamic URL generation failed", error);
        }

        const seen = new Set<string>();
        const urls = [...staticUrls, ...dynamicUrls].filter((entry) => {
          if (seen.has(entry.path)) return false;
          seen.add(entry.path);
          return true;
        });

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map((entry) => {
            const lastmod = entry.lastmod
              ? `\n  <lastmod>${xmlEscape(new Date(entry.lastmod).toISOString())}</lastmod>`
              : "";
            return `<url>\n  <loc>${xmlEscape(`${siteUrl}${entry.path}`)}</loc>${lastmod}\n  <changefreq>weekly</changefreq>\n  <priority>${entry.priority.toFixed(1)}</priority>\n</url>`;
          })
          .join("\n")}\n</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      },
    },
  },
});
