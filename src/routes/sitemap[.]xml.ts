import { createFileRoute } from "@tanstack/react-router";

const SITE_URL = "https://zzerkoff.vercel.app";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {

        const urls = [
          "",
          "/shop",
          "/new-collection",
          "/archive",
          "/about",
          "/contact",
        ];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${urls
  .map(
    (url) => `
<url>
<loc>${SITE_URL}${url}</loc>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>`
  )
  .join("")}

</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
          },
        });
      },
    },
  },
});
