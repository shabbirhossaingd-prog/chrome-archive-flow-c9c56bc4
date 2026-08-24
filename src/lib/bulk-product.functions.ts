import { Buffer } from "node:buffer";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VISION_MODEL = process.env.GEMINI_PRODUCT_VISION_MODEL || "gemini-3.5-flash-lite";

const PRICE_RULES = {
  ring: { min: 299, max: 499, label: "Ring" },
  bracelet: { min: 599, max: 899, label: "Bracelet" },
  "wallet-chain": { min: 599, max: 999, label: "Wallet Chain" },
  glasses: { min: 999, max: 1599, label: "Glasses" },
  chain: { min: 399, max: 699, label: "Chain / Necklace" },
  headphone: { min: 1299, max: 2999, label: "Headphone / Earphone" },
  belt: { min: 1299, max: 1799, label: "Belt" },
  earring: { min: 399, max: 799, label: "Earring" },
  watch: { min: 6999, max: 15999, label: "Watch" },
} as const;

type PriceType = keyof typeof PRICE_RULES;

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

const categorySchema = z.object({
  slug: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(120),
});

const detectInput = z.object({
  image_ref: z.string().trim().min(1).max(500),
  file_name: z.string().trim().max(240).default(""),
  categories: z.array(categorySchema).max(80),
});

const clean = (value: unknown, max = 3000) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

function normalizeType(value: string): PriceType | "other" {
  const v = value.toLowerCase().replace(/[^a-z]+/g, " ").trim();
  if (/watch|wristwatch|timepiece/.test(v)) return "watch";
  if (/wallet|pant chain|waist chain/.test(v)) return "wallet-chain";
  if (/bracelet|wrist/.test(v)) return "bracelet";
  if (/earring|ear ring|ear cuff/.test(v)) return "earring";
  if (/glass|eyewear|sunglass|spectacle/.test(v)) return "glasses";
  if (/headphone|headset|earphone|earbud/.test(v)) return "headphone";
  if (/belt/.test(v)) return "belt";
  if (/ring/.test(v)) return "ring";
  if (/necklace|chain|pendant/.test(v)) return "chain";
  return "other";
}

function matchCategory(
  desiredSlug: string,
  productType: PriceType | "other",
  categories: Array<{ slug: string; name: string }>,
) {
  const exact = categories.find((c) => c.slug === desiredSlug);
  if (exact) return exact.slug;

  const needles: Record<PriceType, string[]> = {
    ring: ["ring"],
    bracelet: ["bracelet"],
    "wallet-chain": ["wallet chain", "pant chain", "waist chain"],
    glasses: ["glass", "eyewear", "sunglass"],
    chain: ["chain", "necklace"],
    headphone: ["headphone", "headset", "earphone", "earbud"],
    belt: ["belt"],
    earring: ["earring", "ear ring"],
    watch: ["watch", "watches", "timepiece"],
  };
  if (productType === "other") return "";

  return (
    categories.find((category) => {
      const haystack = `${category.slug} ${category.name}`.toLowerCase().replace(/-/g, " ");
      return needles[productType].some((needle) => haystack.includes(needle));
    })?.slug ?? ""
  );
}

function clampPrice(productType: PriceType | "other", value: unknown) {
  if (productType === "other") return { price: 0, range: "Needs review" };
  const rule = PRICE_RULES[productType];
  const raw = Number(value);
  const midpoint = Math.round((rule.min + rule.max) / 2);
  const price = Number.isFinite(raw)
    ? Math.min(rule.max, Math.max(rule.min, Math.round(raw)))
    : midpoint;
  return { price, range: `৳${rule.min}–${rule.max}` };
}

export const detectBulkProductFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => detectInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server.");

    if (!data.image_ref.startsWith("storage:")) {
      throw new Error("Bulk AI detection requires an uploaded storage image.");
    }

    const path = data.image_ref.slice("storage:".length);
    const { data: blob, error: downloadError } = await context.supabase.storage
      .from("product-images")
      .download(path);
    if (downloadError || !blob) throw downloadError || new Error("Could not read uploaded image.");

    const bytes = Buffer.from(await blob.arrayBuffer());
    if (!bytes.length) throw new Error("Uploaded image is empty.");
    if (bytes.length > 7 * 1024 * 1024) throw new Error("Image is too large for AI detection.");

    const mimeType = blob.type || "image/webp";
    const allowedCategories = data.categories
      .map((category) => `${category.slug} = ${category.name}`)
      .join("\n");

    const prompt = `You are the product intake assistant for ZZERKOFF, a dark Y2K / chrome / gothic accessories store.
Analyze the supplied product photo and create ONE editable ecommerce product draft.

Choose product_type from these concepts only when visually appropriate:
ring, bracelet, wallet-chain, glasses, chain, headphone, belt, earring, watch, other.

Existing website categories (return category_slug using one of these exact slugs when there is a clear match):
${allowedCategories || "No categories provided"}

Naming rules:
- Create a distinctive short ZZERKOFF-style English product name based on visible shape/style.
- Do not use Ring 1 / Product 1 / Item 1.
- Do not claim brands or copyrighted collaborations.

Facts rules:
- Never invent metal composition, plating, waterproofing, measurements, origin, weight or medical/hypoallergenic claims.
- material must be "Unknown / not confirmed" unless material is genuinely obvious from the image.
- finish should describe visible finish/color only.
- fit_gender should be UNISEX.
- Copy should be premium, dark, Y2K/chrome/gothic but useful and not cheesy.

Pricing rules (suggested_price MUST stay inside the matching type range):
ring 299–499 BDT
bracelet 599–899 BDT
wallet-chain 599–999 BDT
glasses 999–1599 BDT
chain 399–699 BDT
headphone or earphone 1299–2999 BDT
belt 1299–1799 BDT
earring 399–799 BDT
watch 6999–15999 BDT
For other, return 0.

Return product_type, category_slug, confidence (0 to 1), name, suggested_price, material, finish, short_description (max 155 chars), full_description (60-110 words), tags (6-10), details_content, material_content, care, seo_title (max 60 chars), seo_description (145-160 chars), image_alt_text (max 125 chars). Filename hint only: ${data.file_name || "none"}.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(VISION_MODEL)}:generateContent`,
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
              parts: [
                { text: prompt },
                { inlineData: { mimeType, data: bytes.toString("base64") } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                product_type: { type: "string" },
                category_slug: { type: "string" },
                confidence: { type: "number" },
                name: { type: "string" },
                suggested_price: { type: "number" },
                material: { type: "string" },
                finish: { type: "string" },
                short_description: { type: "string" },
                full_description: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                details_content: { type: "string" },
                material_content: { type: "string" },
                care: { type: "string" },
                seo_title: { type: "string" },
                seo_description: { type: "string" },
                image_alt_text: { type: "string" },
              },
              required: [
                "product_type",
                "category_slug",
                "confidence",
                "name",
                "suggested_price",
                "material",
                "finish",
                "short_description",
                "full_description",
                "tags",
                "details_content",
                "material_content",
                "care",
                "seo_title",
                "seo_description",
                "image_alt_text"
              ],
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error("[bulk-product] Gemini vision error", {
        status: response.status,
        detail: detail.slice(0, 1000),
      });
      throw new Error(
        response.status === 429
          ? "Gemini quota is temporarily exhausted. Retry AI detection later."
          : `AI image detection failed (${response.status}).`,
      );
    }

    const body = (await response.json()) as any;
    const raw = body?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text ?? "")
      .join("")
      .trim();
    if (!raw) throw new Error("AI returned an empty product analysis.");

    const parsed = JSON.parse(raw);
    const productType = normalizeType(clean(parsed.product_type, 60));
    const category = matchCategory(clean(parsed.category_slug, 100), productType, data.categories);
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence || 0)));
    const pricing = clampPrice(productType, parsed.suggested_price);
    const name = clean(parsed.name, 160) || `ZZERKOFF ${productType === "other" ? "Object" : PRICE_RULES[productType].label}`;
    const material = clean(parsed.material, 200) || "Unknown / not confirmed";
    const finish = clean(parsed.finish, 200) || "Visible finish — review";
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.map((tag: unknown) => clean(tag, 50).toLowerCase()).filter(Boolean).slice(0, 12)
      : [];

    return {
      product_type: productType,
      category,
      confidence,
      needs_review: !category || productType === "other" || confidence < 0.72,
      name,
      slug: slugify(name),
      price: pricing.price,
      price_range: pricing.range,
      material,
      finish,
      fit_gender: "UNISEX",
      short_description: clean(parsed.short_description, 155),
      full_description: clean(parsed.full_description, 1800),
      tags,
      details_content: clean(parsed.details_content, 1200),
      material_content: clean(parsed.material_content, 1000),
      care: clean(parsed.care, 800),
      seo_title: clean(parsed.seo_title, 70),
      seo_description: clean(parsed.seo_description, 180),
      image_alt_text: clean(parsed.image_alt_text, 140),
    };
  });

const stockStatus = z.enum(["IN STOCK", "LOW STOCK", "PRE-ORDER", "SOLD OUT"]);
const bulkCreateInput = z.object({
  publish: z.boolean(),
  rows: z.array(
    z.object({
      name: z.string().trim().min(1).max(160),
      slug: z.string().trim().max(160).default(""),
      category: z.string().trim().min(1).max(100),
      price: z.number().min(0).max(1000000),
      quantity_available: z.number().int().min(0).max(1000000),
      stock_status: stockStatus,
      primary_image: z.string().trim().min(1).max(500),
      short_description: z.string().max(5000).default(""),
      full_description: z.string().max(10000).default(""),
      material: z.string().max(500).default("Unknown / not confirmed"),
      finish: z.string().max(500).default(""),
      tags: z.array(z.string().max(80)).max(20).default([]),
      details_content: z.string().max(5000).default(""),
      material_content: z.string().max(5000).default(""),
      care: z.string().max(3000).default(""),
      seo_title: z.string().max(200).default(""),
      seo_description: z.string().max(500).default(""),
      image_alt_text: z.string().max(300).default(""),
    }),
  ).min(1).max(60),
});

async function uniqueSlug(supabase: any, base: string) {
  const cleanBase = slugify(base) || `object-${Date.now()}`;
  for (let i = 0; i < 100; i += 1) {
    const candidate = i === 0 ? cleanBase : `${cleanBase}-${i + 1}`;
    const { data, error } = await supabase.from("products").select("id").eq("slug", candidate).limit(1);
    if (error) throw error;
    if (!data?.length) return candidate;
  }
  return `${cleanBase}-${crypto.randomUUID().slice(0, 8)}`;
}

export const createBulkProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => bulkCreateInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const created: Array<{ id: string; code: string; name: string }> = [];
    const failed: Array<{ name: string; error: string }> = [];

    for (const row of data.rows) {
      try {
        if (data.publish && row.price <= 0) throw new Error("Price is required before publishing.");
        if (data.publish && !row.short_description.trim()) throw new Error("AI/content review is required before publishing.");

        const quantity = row.stock_status === "SOLD OUT" ? 0 : Math.max(0, row.quantity_available);
        const status =
          row.stock_status === "PRE-ORDER"
            ? "PRE-ORDER"
            : quantity <= 0
              ? "SOLD OUT"
              : row.stock_status;
        const slug = await uniqueSlug(context.supabase, row.slug || row.name);
        const { data: code, error: codeError } = await context.supabase.rpc("next_product_code", {
          _category: row.category,
        });
        if (codeError) throw codeError;

        const { data: inserted, error } = await context.supabase
          .from("products")
          .insert({
            product_code: code,
            name: row.name.trim(),
            slug,
            category: row.category,
            price: row.price,
            old_price: null,
            quantity_available: quantity,
            stock_status: status,
            short_description: row.short_description,
            full_description: row.full_description,
            seo_title: row.seo_title,
            seo_description: row.seo_description,
            image_alt_text: row.image_alt_text || row.name,
            material: row.material || "Unknown / not confirmed",
            finish: row.finish ? [row.finish] : [],
            fit_gender: "UNISEX",
            tags: row.tags,
            size_type: "ONE SIZE",
            sizes: [],
            size_description: "",
            size_guide: "",
            details_content: row.details_content,
            material_content: row.material_content,
            care: row.care,
            delivery: "",
            collection_id: null,
            collection_name: "",
            related_product_ids: [],
            featured: false,
            new_collection: false,
            archived: false,
            published: data.publish,
            whatsapp_available: true,
            primary_image: row.primary_image,
            gallery_images: [],
            sort_order: 0,
          })
          .select("id,product_code,name")
          .single();
        if (error) throw error;
        created.push({ id: inserted.id, code: inserted.product_code, name: inserted.name });
      } catch (error) {
        failed.push({
          name: row.name,
          error: error instanceof Error ? error.message : "Could not create product",
        });
      }
    }

    return { created, failed };
  });

export const bulkProductPriceRules = PRICE_RULES;
