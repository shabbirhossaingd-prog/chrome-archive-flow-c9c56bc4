import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

const inputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  drop_number: z.number().int().min(1).max(9999),
  year: z.string().trim().max(12).optional().default(""),
  existing_tagline: z.string().trim().max(300).optional().default(""),
  existing_description: z.string().trim().max(2500).optional().default(""),
  products: z
    .array(
      z.object({
        name: z.string().trim().max(160),
        category: z.string().trim().max(80),
      }),
    )
    .max(24)
    .optional()
    .default([]),
});

const clean = (value: unknown, max = 5000) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

export const generateCollectionContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured on the server.");
    }

    const productContext = data.products.length
      ? data.products
          .map((product) => `- ${product.name} (${product.category})`)
          .join("\n")
      : "No products have been assigned yet.";

    const prompt = `You are the collection copywriter for ZZERKOFF, an alternative unisex accessories brand with a chrome, gothic, vintage, underground and Y2K visual language.\n\nCreate polished collection copy using ONLY the supplied information. Do not invent product materials, measurements, availability, launch dates, collaborations, statistics, cultural claims, or product specifications. If products are listed, use only their names/categories as light context.\n\nTone: dark, premium, minimal, editorial, fashion-forward, not cheesy, not overly poetic. Write in English.\n\nCOLLECTION\nName: ${data.name}\nDrop number: ${data.drop_number}\nYear: ${data.year || "not specified"}\nExisting tagline: ${data.existing_tagline || "none"}\nExisting description notes: ${data.existing_description || "none"}\nAssigned products:\n${productContext}\n\nReturn JSON with:\n- label: short uppercase label such as ZZ / COLLECTION / 003\n- heading: short display heading, max 50 characters\n- tagline: one sharp sentence, max 110 characters\n- description: useful editorial collection introduction, 90-150 words, no fake facts\n- marquee_text: short repeating phrase, max 100 characters\n- button_label: short CTA, max 28 characters`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
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
            responseSchema: {
              type: "object",
              properties: {
                label: { type: "string" },
                heading: { type: "string" },
                tagline: { type: "string" },
                description: { type: "string" },
                marquee_text: { type: "string" },
                button_label: { type: "string" },
              },
              required: [
                "label",
                "heading",
                "tagline",
                "description",
                "marquee_text",
                "button_label",
              ],
            },
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        response.status === 429
          ? "Gemini free quota is temporarily exhausted."
          : `Gemini collection generation failed (${response.status}).`,
      );
    }

    const body = (await response.json()) as any;
    const raw =
      body?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text ?? "")
        .join("")
        .trim() ?? "";

    if (!raw) throw new Error("Gemini returned an empty response.");

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Gemini returned invalid structured content.");
    }

    return {
      label: clean(parsed.label, 80),
      heading: clean(parsed.heading, 60),
      tagline: clean(parsed.tagline, 130),
      description: clean(parsed.description, 1800),
      marquee_text: clean(parsed.marquee_text, 120),
      button_label: clean(parsed.button_label, 32),
    };
  });
