-- Product-level editable SEO fields used by Gemini + admin manual editing.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS seo_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS seo_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_alt_text text NOT NULL DEFAULT '';
