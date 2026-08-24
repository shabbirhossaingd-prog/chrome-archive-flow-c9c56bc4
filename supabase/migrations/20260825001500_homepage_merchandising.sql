CREATE TABLE IF NOT EXISTS public.homepage_merch_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_name text NOT NULL DEFAULT 'Merch section',
  eyebrow text NOT NULL DEFAULT 'ZZ / CURATED',
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  section_type text NOT NULL DEFAULT 'manual'
    CHECK (section_type IN ('manual', 'category', 'new', 'featured', 'sale')),
  category_slug text NOT NULL DEFAULT '',
  product_ids uuid[] NOT NULL DEFAULT '{}',
  limit_count integer NOT NULL DEFAULT 4 CHECK (limit_count BETWEEN 1 AND 12),
  button_label text NOT NULL DEFAULT '',
  button_href text NOT NULL DEFAULT '/shop',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.homepage_merch_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active homepage merch" ON public.homepage_merch_sections;
CREATE POLICY "Public can read active homepage merch"
ON public.homepage_merch_sections
FOR SELECT
TO anon, authenticated
USING (active = true);

DROP POLICY IF EXISTS "Admins manage homepage merch" ON public.homepage_merch_sections;
CREATE POLICY "Admins manage homepage merch"
ON public.homepage_merch_sections
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS homepage_merch_sections_sort_idx
  ON public.homepage_merch_sections (active, sort_order, created_at);

CREATE OR REPLACE FUNCTION public.touch_homepage_merch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS homepage_merch_touch_updated_at ON public.homepage_merch_sections;
CREATE TRIGGER homepage_merch_touch_updated_at
BEFORE UPDATE ON public.homepage_merch_sections
FOR EACH ROW EXECUTE FUNCTION public.touch_homepage_merch_updated_at();
