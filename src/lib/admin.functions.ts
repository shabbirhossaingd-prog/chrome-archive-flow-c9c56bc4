import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: {
  userId: string;
  supabase: any;
}) {
  const { data: roles, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .limit(1);

  if (error) throw error;
  if (!roles || roles.length === 0) throw new Error("Forbidden");
}

export const ensureAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .limit(1);

    if (error) {
      console.error("[ensureAdmin] role lookup failed", {
        userId: context.userId,
        email: (context.claims as { email?: string })?.email,
        error: error.message,
      });
      throw error;
    }

    const isAdmin = (roles ?? []).length > 0;
    if (!isAdmin) {
      console.warn("[ensureAdmin] no admin role", {
        userId: context.userId,
        email: (context.claims as { email?: string })?.email,
      });
    }

    return { isAdmin };
  });


export const peekProductCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ category: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { data: code, error } = await context.supabase.rpc(
      "peek_product_code",
      {
        _category: data.category,
      },
    );

    if (error) throw error;

    return { code: code as string };
  });

export const reserveProductCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ category: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { data: code, error } = await context.supabase.rpc(
      "next_product_code",
      {
        _category: data.category,
      },
    );

    if (error) throw error;

    return { code: code as string };
  });

export const logAdminAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        action: z.string().min(1).max(40),
        entity: z.string().min(1).max(40),
        entity_id: z.string().max(120).optional(),
        label: z.string().max(200).optional(),
        details: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { error } = await context.supabase
      .from("admin_audit_log")
      .insert({
        actor_id: context.userId,
        actor_email:
          (context.claims as { email?: string })?.email ?? "",
        action: data.action,
        entity: data.entity,
        entity_id: data.entity_id ?? null,
        label: data.label ?? "",
        details: (data.details ?? {}) as never,
      });

    if (error) throw error;

    return { ok: true };
  });


const productAiInput = z.object({
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().min(1).max(80),
  material: z.string().trim().max(200).optional().default(""),
  finish: z.string().trim().max(200).optional().default(""),
  fit_gender: z.string().trim().max(80).optional().default("UNISEX"),
  sizes: z.string().trim().max(200).optional().default(""),
  size_description: z.string().trim().max(500).optional().default(""),
  existing_description: z.string().trim().max(2500).optional().default(""),
});

export const generateProductContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => productAiInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured on the server. Add it in Vercel Environment Variables.",
      );
    }

    const facts = [
      `Product name: ${data.name}`,
      `Category: ${data.category}`,
      data.material ? `Material: ${data.material}` : "",
      data.finish ? `Finish / color: ${data.finish}` : "",
      data.fit_gender ? `Fit / gender: ${data.fit_gender}` : "",
      data.sizes ? `Sizes: ${data.sizes}` : "",
      data.size_description ? `Size notes: ${data.size_description}` : "",
      data.existing_description
        ? `Existing notes to improve: ${data.existing_description}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `
You are the ecommerce copy and SEO assistant for ZZERKOFF, an alternative accessories label.

Write polished ecommerce copy from ONLY the facts supplied below.
Never invent metal type, plating, waterproof claims, measurements, origin, weight,
hypoallergenic claims, warranty, or any other factual attribute that was not supplied.
Tone: premium, underground, chrome/vintage/gothic/Y2K, concise, clear, not cheesy.
Write in English.

PRODUCT FACTS
${facts}

Return:
- slug: short SEO-friendly lowercase hyphen slug
- short_description: concise product summary, max 155 characters
- full_description: 70-120 words, useful and natural
- tags: 6-12 relevant search tags, no hashtags
- details_content: concise feature/details copy using only known facts
- material_content: material/finish copy; if material is unknown, do not guess it
- care: safe generic accessory care without making material-specific claims
- seo_title: max 60 characters, include product intent naturally, end with ZZERKOFF only if it fits
- seo_description: about 145-160 characters, useful and search-friendly
- image_alt_text: descriptive accessible product image alt text, max 125 characters
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
"Content-Type": "application/json",
"x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
contents: [
  {
    role: "user",
    parts: [{ text: prompt }],
  },
],
generationConfig: {
  temperature: 0.45,
  responseMimeType: "application/json",
  responseSchema: {
    type: "object",
    properties: {
      slug: { type: "string" },
      short_description: { type: "string" },
      full_description: { type: "string" },
      tags: {
        type: "array",
        items: { type: "string" },
      },
      details_content: { type: "string" },
      material_content: { type: "string" },
      care: { type: "string" },
      seo_title: { type: "string" },
      seo_description: { type: "string" },
      image_alt_text: { type: "string" },
    },
    required: [
      "slug",
      "short_description",
      "full_description",
      "tags",
      "details_content",
      "material_content",
      "care",
      "seo_title",
      "seo_description",
      "image_alt_text",
    ],
  },
},
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error("[generateProductContent] Gemini error", {
        status: response.status,
        detail: detail.slice(0, 800),
      });
      throw new Error(
        response.status === 429
? "Gemini free quota is temporarily exhausted. Try again later."
: "Gemini could not generate the product content.",
      );
    }

    const body = (await response.json()) as any;
    const raw =
      body?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text ?? "")
        .join("")
        .trim() ?? "";

    if (!raw) {
      throw new Error("Gemini returned an empty response.");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Gemini returned invalid structured content.");
    }

    const clean = (value: unknown, max = 5000) =>
      String(value ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max);

    const slug = clean(parsed.slug, 180)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const tags = Array.isArray(parsed.tags)
      ? parsed.tags
.map((tag: unknown) => clean(tag, 60).toLowerCase())
.filter(Boolean)
.slice(0, 12)
      : [];

    return {
      slug,
      short_description: clean(parsed.short_description, 155),
      full_description: clean(parsed.full_description, 1800),
      tags,
      details_content: clean(parsed.details_content, 1200),
      material_content: clean(parsed.material_content, 1000),
      care: clean(parsed.care, 800),
      seo_title: clean(parsed.seo_title, 70),
      seo_description: clean(parsed.seo_description, 170),
      image_alt_text: clean(parsed.image_alt_text, 140),
    };
  });
