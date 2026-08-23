-- ZZERKOFF growth suite: reviews, restock alerts, account commerce sync.
-- Safe to run more than once where possible.

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  verified_purchase boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

CREATE INDEX IF NOT EXISTS product_reviews_product_idx
  ON public.product_reviews(product_id, status, created_at DESC);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.product_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;

DROP POLICY IF EXISTS "Public view approved reviews" ON public.product_reviews;
CREATE POLICY "Public view approved reviews"
ON public.product_reviews FOR SELECT
USING (status = 'approved' OR user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage reviews" ON public.product_reviews;
CREATE POLICY "Admins manage reviews"
ON public.product_reviews FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.submit_product_review(
  p_product_id uuid,
  p_rating integer,
  p_title text,
  p_body text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
  v_verified boolean := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in to review this object.';
  END IF;
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5.';
  END IF;
  IF length(trim(COALESCE(p_body, ''))) < 8 THEN
    RAISE EXCEPTION 'Write a little more about your experience.';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.orders
    WHERE customer_user_id = v_user
      AND product_id = p_product_id
      AND status = 'delivered'
  ) INTO v_verified;

  IF NOT v_verified THEN
    RAISE EXCEPTION 'Reviews are available after a delivered purchase.';
  END IF;

  INSERT INTO public.product_reviews(product_id, user_id, rating, title, body, verified_purchase, status)
  VALUES (
    p_product_id,
    v_user,
    p_rating,
    left(trim(COALESCE(p_title, '')), 120),
    left(trim(COALESCE(p_body, '')), 1500),
    true,
    'pending'
  )
  ON CONFLICT (product_id, user_id)
  DO UPDATE SET
    rating = EXCLUDED.rating,
    title = EXCLUDED.title,
    body = EXCLUDED.body,
    verified_purchase = true,
    status = 'pending',
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_product_review(uuid, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_product_review(uuid, integer, text, text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.restock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  UNIQUE(product_id, email, phone)
);

CREATE INDEX IF NOT EXISTS restock_alerts_pending_idx
  ON public.restock_alerts(product_id, created_at)
  WHERE notified_at IS NULL;

ALTER TABLE public.restock_alerts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE, DELETE ON public.restock_alerts TO authenticated;

DROP POLICY IF EXISTS "Admins manage restock alerts" ON public.restock_alerts;
CREATE POLICY "Admins manage restock alerts"
ON public.restock_alerts FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.subscribe_restock_alert(
  p_product_id uuid,
  p_email text,
  p_phone text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(COALESCE(p_email, '')));
  v_phone text := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
BEGIN
  IF v_email = '' AND v_phone = '' THEN
    RAISE EXCEPTION 'Enter an email or phone number.';
  END IF;
  IF v_email <> '' AND position('@' in v_email) = 0 THEN
    RAISE EXCEPTION 'Enter a valid email address.';
  END IF;
  IF v_phone <> '' AND length(v_phone) < 10 THEN
    RAISE EXCEPTION 'Enter a valid phone number.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id AND published = true) THEN
    RAISE EXCEPTION 'Object not found.';
  END IF;

  INSERT INTO public.restock_alerts(product_id, email, phone)
  VALUES (p_product_id, v_email, v_phone)
  ON CONFLICT (product_id, email, phone)
  DO UPDATE SET notified_at = NULL, created_at = now();

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.subscribe_restock_alert(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscribe_restock_alert(uuid, text, text) TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.customer_wishlist (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.customer_cart (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  item_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_key)
);

ALTER TABLE public.customer_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_cart ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_wishlist TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_cart TO authenticated;

DROP POLICY IF EXISTS "Customers manage own wishlist" ON public.customer_wishlist;
CREATE POLICY "Customers manage own wishlist"
ON public.customer_wishlist FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Customers manage own cart" ON public.customer_cart;
CREATE POLICY "Customers manage own cart"
ON public.customer_cart FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins view wishlist" ON public.customer_wishlist;
CREATE POLICY "Admins view wishlist"
ON public.customer_wishlist FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins view carts" ON public.customer_cart;
CREATE POLICY "Admins view carts"
ON public.customer_cart FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));
