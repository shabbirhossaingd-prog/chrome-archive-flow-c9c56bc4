CREATE TABLE IF NOT EXISTS public.homepage_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_name text NOT NULL DEFAULT 'Banner',
  image_url text NOT NULL DEFAULT '',
  headline text NOT NULL DEFAULT '',
  offer_text text NOT NULL DEFAULT '',
  button_label text NOT NULL DEFAULT '',
  button_href text NOT NULL DEFAULT '/shop',
  full_link text NOT NULL DEFAULT '',
  style text NOT NULL DEFAULT 'chrome-frame'
    CHECK (style IN ('chrome-frame', 'system-alert', 'editorial-dark')),
  text_position text NOT NULL DEFAULT 'left'
    CHECK (text_position IN ('left', 'center', 'right')),
  overlay_strength text NOT NULL DEFAULT 'medium'
    CHECK (overlay_strength IN ('none', 'light', 'medium', 'dark')),
  image_only boolean NOT NULL DEFAULT false,
  show_button boolean NOT NULL DEFAULT true,
  show_countdown boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT false,
  start_at timestamptz,
  end_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.homepage_banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read live homepage banners" ON public.homepage_banners;
CREATE POLICY "Public can read live homepage banners"
ON public.homepage_banners
FOR SELECT
TO anon, authenticated
USING (
  active = true
  AND (start_at IS NULL OR start_at <= now())
  AND (end_at IS NULL OR end_at > now())
);

DROP POLICY IF EXISTS "Admins manage homepage banners" ON public.homepage_banners;
CREATE POLICY "Admins manage homepage banners"
ON public.homepage_banners
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS homepage_banners_live_sort_idx
  ON public.homepage_banners (active, sort_order, start_at, end_at);
