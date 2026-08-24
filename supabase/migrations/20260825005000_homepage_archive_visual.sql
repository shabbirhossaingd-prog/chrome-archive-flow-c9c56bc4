CREATE TABLE IF NOT EXISTS public.homepage_archive_visual (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title text NOT NULL DEFAULT 'THE ARCHIVE',
  series_label text NOT NULL DEFAULT 'ZZ / VISUAL SERIES 001',
  active boolean NOT NULL DEFAULT true,
  left_image text NOT NULL DEFAULT '',
  left_alt text NOT NULL DEFAULT '',
  left_link text NOT NULL DEFAULT '',
  top_right_image text NOT NULL DEFAULT '',
  top_right_alt text NOT NULL DEFAULT '',
  top_right_link text NOT NULL DEFAULT '',
  bottom_right_image text NOT NULL DEFAULT '',
  bottom_right_alt text NOT NULL DEFAULT '',
  bottom_right_link text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.homepage_archive_visual ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read homepage archive visual"
ON public.homepage_archive_visual;

CREATE POLICY "Public can read homepage archive visual"
ON public.homepage_archive_visual
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins manage homepage archive visual"
ON public.homepage_archive_visual;

CREATE POLICY "Admins manage homepage archive visual"
ON public.homepage_archive_visual
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.touch_homepage_archive_visual_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS homepage_archive_visual_touch_updated_at
ON public.homepage_archive_visual;

CREATE TRIGGER homepage_archive_visual_touch_updated_at
BEFORE UPDATE ON public.homepage_archive_visual
FOR EACH ROW
EXECUTE FUNCTION public.touch_homepage_archive_visual_updated_at();
