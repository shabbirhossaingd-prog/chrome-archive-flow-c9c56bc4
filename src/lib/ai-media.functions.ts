import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Buffer } from "node:buffer";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildBlogImageFallbackPrompt } from "@/lib/blog-image-prompt";

const TEXT_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image";

async function assertAdmin(context: { userId: string; supabase: any }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .limit(1);
  if (error) throw error;
  if (!data?.length) throw new Error("Forbidden");
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

async function geminiJson(apiKey: string, prompt: string, responseSchema: Record<string, unknown>) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
    },
  );

  if (!response.ok) {
    if (response.status === 429) throw new Error("Gemini free quota is temporarily exhausted.");
    throw new Error(`Gemini text generation failed (${response.status}).`);
  }

  const body = (await response.json()) as any;
  const raw =
    body?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text ?? "")
      .join("") ?? "";
  if (!raw) throw new Error("Gemini returned an empty text response.");
  return JSON.parse(raw);
}

const VISUAL_RULES = `
ZZERKOFF visual direction: premium dark fashion editorial, underground Y2K, gothic metal, chrome highlights, flash photography, tactile black surfaces, cinematic contrast, believable materials, clean composition.
IMPORTANT OUTPUT RULES: create the visual artwork only. Do NOT render any words, letters, numbers, typography, captions, logos, brand marks, interface icons, pictograms, buttons, badges, stickers, labels, watermarks, QR codes, fake signatures, or pseudo-text. Do not place text-like marks in the background. Website copy will be overlaid separately with HTML.
Avoid generic ecommerce templates, clip-art, app UI, poster text, and iconography.`;

async function generateStoredImage(args: {
  apiKey: string;
  supabase: any;
  prompt: string;
  aspectRatio: "4:3" | "16:9";
  purpose: "blog" | "banner";
}) {
  const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": args.apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${args.prompt}\n\n${VISUAL_RULES}` }],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE"],
          responseFormat: {
            image: {
              aspectRatio: args.aspectRatio,
              imageSize: "1K",
            },
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("[ai-image] Gemini request failed", {
      status: response.status,
      model,
      purpose: args.purpose,
      response: errorText.slice(0, 1200),
    });
    if (response.status === 429) throw new Error("Gemini image quota is temporarily exhausted.");
    throw new Error(`Gemini image generation failed (${response.status}).`);
  }

  const body = (await response.json()) as any;
  const parts = body?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part: any) => part?.inlineData?.data);
  const encoded = imagePart?.inlineData?.data;
  const mimeType = String(imagePart?.inlineData?.mimeType || "image/png");
  if (!encoded) throw new Error("Gemini returned no image data. Try generating again.");

  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.length) throw new Error("Gemini returned an empty image.");
  if (bytes.length > 10 * 1024 * 1024) throw new Error("Generated image is too large to store safely.");

  const extension = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  const path = `ai/${args.purpose}-${crypto.randomUUID()}.${extension}`;
  const { error } = await args.supabase.storage.from("product-images").upload(path, bytes, {
    cacheControl: "31536000",
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw error;

  return `storage:${path}`;
}

const blogSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    slug: { type: "string" },
    excerpt: { type: "string" },
    seo_title: { type: "string" },
    seo_description: { type: "string" },
    content_html: { type: "string" },
    image_prompt: { type: "string" },
  },
  required: [
    "title",
    "slug",
    "excerpt",
    "seo_title",
    "seo_description",
    "content_html",
    "image_prompt",
  ],
};

export const generateAiBlogWithImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server.");

    const { data: existing, error: existingError } = await context.supabase
      .from("blog_posts")
      .select("title,slug")
      .order("created_at", { ascending: false })
      .limit(100);
    if (existingError) throw existingError;

    const existingTitles = (existing ?? []).map((row: any) => row.title).join("\n");
    const prompt = `You are the editorial and SEO writer for ZZERKOFF, a unisex alternative accessories brand focused on chrome, vintage, gothic, underground and Y2K styling.

Create exactly ONE genuinely useful, non-duplicate blog article. Avoid invented product facts, medical claims, fake statistics and fake trends. Focus on styling, sizing, care, accessory coordination, buying decisions, or subculture-inspired fashion education.

Do not reuse or closely imitate these existing titles:
${existingTitles || "None yet"}

Return title, slug, excerpt (max 180 chars), seo_title (max 60 chars), seo_description (145-160 chars), content_html, and image_prompt. content_html must be clean semantic HTML using only h2, h3, p, ul, ol, li, strong, em and blockquote. Aim for 700-1100 useful words. Do not include an h1.

image_prompt must describe one clean 4:3 fashion-editorial featured image that visually matches the article. It should feel like ZZERKOFF: dark, chrome, gothic, Y2K, premium editorial photography. Do not request any typography, logo, icon, watermark, badge, label or text in the image.`;

    const article = await geminiJson(apiKey, prompt, blogSchema);
    const title = String(article.title || "").trim().slice(0, 180);
    const baseSlug = slugify(String(article.slug || title));
    if (!title || !baseSlug) throw new Error("Gemini did not return a usable article title.");

    const usedSlugs = new Set((existing ?? []).map((row: any) => String(row.slug)));
    let slug = baseSlug;
    let suffix = 2;
    while (usedSlugs.has(slug)) slug = `${baseSlug}-${suffix++}`;

    const excerpt = String(article.excerpt || "").trim().slice(0, 220);
    const generatedPrompt = String(article.image_prompt || "").trim();
    const imagePrompt = generatedPrompt || buildBlogImageFallbackPrompt({ title, excerpt });

    let featuredImage = "";
    let imageError = "";
    try {
      featuredImage = await generateStoredImage({
        apiKey,
        supabase: context.supabase,
        prompt: imagePrompt,
        aspectRatio: "4:3",
        purpose: "blog",
      });
    } catch (error) {
      imageError = error instanceof Error ? error.message : "Image generation failed.";
      console.error("[ai-blog] Saving draft without generated image", imageError);
    }

    const { data: inserted, error } = await context.supabase
      .from("blog_posts")
      .insert({
        title,
        slug,
        excerpt,
        content: String(article.content_html || "").trim().slice(0, 30000),
        seo_title: String(article.seo_title || title).trim().slice(0, 70),
        seo_description: String(article.seo_description || "").trim().slice(0, 180),
        featured_image: featuredImage,
        status: "draft",
        published_at: null,
        featured: false,
      })
      .select("id,title,slug,excerpt,featured_image")
      .single();
    if (error) throw error;

    return {
      created: inserted,
      imageGenerated: Boolean(featuredImage),
      imagePrompt: buildBlogImageFallbackPrompt({ title, excerpt }),
      imageError,
    };
  });

const retryBlogImageInput = z.object({
  post_id: z.string().uuid(),
});

export const retryAiBlogImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => retryBlogImageInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server.");

    const { data: post, error: postError } = await context.supabase
      .from("blog_posts")
      .select("id,title,excerpt")
      .eq("id", data.post_id)
      .single();
    if (postError) throw postError;

    const imagePrompt = buildBlogImageFallbackPrompt({
      title: String(post.title || "ZZERKOFF journal editorial"),
      excerpt: String(post.excerpt || ""),
    });

    const featuredImage = await generateStoredImage({
      apiKey,
      supabase: context.supabase,
      prompt: imagePrompt,
      aspectRatio: "4:3",
      purpose: "blog",
    });

    const { data: updated, error } = await context.supabase
      .from("blog_posts")
      .update({ featured_image: featuredImage })
      .eq("id", data.post_id)
      .select("id,title,featured_image")
      .single();
    if (error) throw error;

    return { updated, imagePrompt };
  });

const bannerInput = z.object({
  prompt: z.string().trim().min(3).max(1600),
  style: z.enum(["chrome-frame", "system-alert", "editorial-dark"]).default("chrome-frame"),
  button_href: z.string().trim().max(500).default("/shop"),
});

const bannerCopySchema = {
  type: "object",
  properties: {
    internal_name: { type: "string" },
    headline: { type: "string" },
    offer_text: { type: "string" },
    button_label: { type: "string" },
    image_prompt: { type: "string" },
  },
  required: ["internal_name", "headline", "offer_text", "button_label", "image_prompt"],
};

export const generateAiBannerDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => bannerInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server.");

    const copyPrompt = `You are the campaign art director and ecommerce copywriter for ZZERKOFF, a dark Y2K / gothic / chrome accessories label.

User campaign brief:
${data.prompt}

Create concise homepage banner copy and a visual-generation prompt. Keep the tone premium, underground, sharp and minimal. Do not invent discount percentages, prices, dates, free shipping claims, stock claims or product facts that are not present in the user brief. If no numeric offer is supplied, use a non-numeric campaign line instead.

Return:
- internal_name: short admin campaign name
- headline: max 5 words
- offer_text: max 14 words
- button_label: max 3 words
- image_prompt: a clean wide fashion editorial visual matching the brief and ZZERKOFF style. Do not request text, logos, icons, watermarks, labels or UI inside the generated image. Leave useful negative space for website HTML copy.`;

    const copy = await geminiJson(apiKey, copyPrompt, bannerCopySchema);
    const imageUrl = await generateStoredImage({
      apiKey,
      supabase: context.supabase,
      prompt: String(copy.image_prompt || data.prompt),
      aspectRatio: "16:9",
      purpose: "banner",
    });

    const payload = {
      internal_name: String(copy.internal_name || "AI Banner").trim().slice(0, 100),
      image_url: imageUrl,
      headline: String(copy.headline || "").trim().slice(0, 100),
      offer_text: String(copy.offer_text || "").trim().slice(0, 220),
      button_label: String(copy.button_label || "SHOP NOW").trim().slice(0, 40),
      button_href: data.button_href || "/shop",
      full_link: "",
      style: data.style,
      text_position: "left",
      overlay_strength: "medium",
      image_only: false,
      show_button: true,
      show_countdown: false,
      active: false,
      start_at: null,
      end_at: null,
      sort_order: 0,
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await (context.supabase as any)
      .from("homepage_banners")
      .insert(payload)
      .select("id,internal_name,headline,image_url")
      .single();
    if (error) throw error;

    return { created: inserted };
  });
