import { createFileRoute } from "@tanstack/react-router";

const authorized = (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

export const Route = createFileRoute("/api/cron/ai-blog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return new Response("GEMINI_API_KEY missing", { status: 500 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: existing } = await supabaseAdmin
          .from("blog_posts")
          .select("title,slug")
          .order("created_at", { ascending: false })
          .limit(80);

        const existingTitles = (existing ?? []).map((row) => row.title).join("\n");
        const count = Math.min(4, Math.max(1, Number(process.env.AI_BLOG_DAILY_COUNT || 3)));
        const autoPublish = process.env.AI_BLOG_AUTO_PUBLISH === "true";

        const prompt = `You are the editorial and SEO writer for ZZERKOFF, a unisex alternative accessories brand focused on chrome, vintage, gothic, underground and Y2K styling.\n\nCreate ${count} genuinely useful, non-duplicate blog articles. Avoid invented product facts, medical claims, fake statistics and fake trends. Articles should help shoppers with styling, sizing, care, materials in general, accessory coordination, buying decisions, or subculture-inspired fashion education.\n\nDo not reuse or closely imitate these existing titles:\n${existingTitles || "None yet"}\n\nFor each article return: title, slug, excerpt (max 180 chars), seo_title (max 60 chars), seo_description (145-160 chars), and content_html. content_html must be clean semantic HTML using only h2, h3, p, ul, ol, li, strong, em and blockquote. Aim for 700-1100 useful words per article. Do not include an h1 because the page already renders the title.`;

        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                responseMimeType: "application/json",
                responseSchema: {
                  type: "object",
                  properties: {
                    articles: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          slug: { type: "string" },
                          excerpt: { type: "string" },
                          seo_title: { type: "string" },
                          seo_description: { type: "string" },
                          content_html: { type: "string" },
                        },
                        required: ["title", "slug", "excerpt", "seo_title", "seo_description", "content_html"],
                      },
                    },
                  },
                  required: ["articles"],
                },
              },
            }),
          },
        );

        if (!response.ok) {
          const detail = await response.text();
          console.error("[ai-blog] Gemini error", response.status, detail.slice(0, 500));
          return new Response("Gemini generation failed", { status: 502 });
        }

        const body = (await response.json()) as any;
        const raw = body?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text ?? "").join("") ?? "";
        const parsed = JSON.parse(raw);
        const articles = Array.isArray(parsed?.articles) ? parsed.articles.slice(0, count) : [];
        const created: string[] = [];

        for (const article of articles) {
          const title = String(article.title || "").trim().slice(0, 180);
          const baseSlug = slugify(String(article.slug || title));
          if (!title || !baseSlug) continue;

          let slug = baseSlug;
          let suffix = 2;
          while ((existing ?? []).some((row) => row.slug === slug)) {
            slug = `${baseSlug}-${suffix++}`;
          }

          const { error } = await supabaseAdmin.from("blog_posts").insert({
            title,
            slug,
            excerpt: String(article.excerpt || "").trim().slice(0, 220),
            content: String(article.content_html || "").trim().slice(0, 30000),
            seo_title: String(article.seo_title || title).trim().slice(0, 70),
            seo_description: String(article.seo_description || "").trim().slice(0, 180),
            status: autoPublish ? "published" : "draft",
            published_at: autoPublish ? new Date().toISOString() : null,
            featured: false,
          });

          if (!error) created.push(slug);
          else console.error("[ai-blog] insert failed", error.message);
        }

        return Response.json({ ok: true, created, mode: autoPublish ? "published" : "draft" });
      },
    },
  },
});
