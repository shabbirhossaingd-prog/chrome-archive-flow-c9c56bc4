-- ZZERKOFF PRE-ORDER STATUS + TRACKING FLOW
-- PRE-ORDER product checkout starts as status = 'pre_order'.
-- Normal stock checkout starts as status = 'new'.
-- Tracking can now show PRE-ORDER before NEW only for pre-order orders.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sales_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

DO $$
DECLARE
  v_constraint text;
BEGIN
  FOR v_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
      AND pg_get_constraintdef(oid) ILIKE '%cancelled%'
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS %I', v_constraint);
  END LOOP;

  ALTER TABLE public.orders
    ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pre_order', 'new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'));
END $$;

CREATE INDEX IF NOT EXISTS orders_source_status_created_idx
  ON public.orders (source, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.create_commerce_order(
  p_product_id uuid,
  p_customer_name text,
  p_phone text,
  p_address text,
  p_size text,
  p_finish text,
  p_color text,
  p_quantity integer,
  p_map_url text,
  p_latitude numeric,
  p_longitude numeric,
  p_note text,
  p_payment_method text,
  p_transaction_id text,
  p_promo_code text,
  p_customer_email text
)
RETURNS TABLE(order_number text, total_price numeric, discount_amount numeric, promo_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_settings public.site_settings%ROWTYPE;
  v_order_id uuid;
  v_order_number text;
  v_original_total numeric;
  v_final_total numeric;
  v_discount numeric := 0;
  v_code text := NULL;
  v_color text := NULLIF(trim(COALESCE(p_color, '')), '');
  v_color_available integer := 0;
  v_method text;
  v_payment_status text;
  v_promo public.commerce_promos%ROWTYPE;
  v_is_preorder boolean := false;
  v_order_source text := 'website';
  v_order_status text := 'new';
  v_email text := NULLIF(trim(COALESCE(p_customer_email, '')), '');
BEGIN
  IF char_length(trim(COALESCE(p_customer_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Please enter your name.';
  END IF;

  IF char_length(regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g')) < 7 THEN
    RAISE EXCEPTION 'Please enter a valid phone number.';
  END IF;

  IF char_length(trim(COALESCE(p_address, ''))) < 5 THEN
    RAISE EXCEPTION 'Please enter your full delivery address.';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 20 THEN
    RAISE EXCEPTION 'Invalid quantity.';
  END IF;

  SELECT *
  INTO v_product
  FROM public.products
  WHERE id = p_product_id
    AND published = true
    AND COALESCE(archived, false) = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This object is no longer available.';
  END IF;

  v_is_preorder := upper(COALESCE(v_product.stock_status, '')) = 'PRE-ORDER';

  IF v_is_preorder THEN
    v_order_source := 'preorder';
    v_order_status := 'pre_order';
  END IF;

  IF NOT v_is_preorder THEN
    IF v_product.stock_status = 'SOLD OUT'
       OR COALESCE(v_product.quantity_available, 0) <= 0
       OR p_quantity > COALESCE(v_product.quantity_available, 0) THEN
      RAISE EXCEPTION 'Requested quantity is not available.';
    END IF;
  END IF;

  IF COALESCE(array_length(v_product.sizes, 1), 0) > 0
     AND NOT (COALESCE(p_size, '') = ANY(v_product.sizes)) THEN
    RAISE EXCEPTION 'Please select a valid size.';
  END IF;

  IF COALESCE(array_length(v_product.finish, 1), 0) > 0
     AND NOT (COALESCE(p_finish, '') = ANY(v_product.finish)) THEN
    RAISE EXCEPTION 'Please select a valid finish.';
  END IF;

  IF COALESCE(array_length(v_product.colors, 1), 0) > 0 THEN
    IF v_color IS NULL OR NOT (v_color = ANY(v_product.colors)) THEN
      RAISE EXCEPTION 'Please select a valid color.';
    END IF;

    IF NOT v_is_preorder THEN
      v_color_available := COALESCE((v_product.color_stock ->> v_color)::integer, 0);
      IF v_color_available < p_quantity THEN
        RAISE EXCEPTION 'Requested quantity is not available in %.', v_color;
      END IF;
    END IF;
  ELSE
    v_color := NULL;
  END IF;

  SELECT * INTO v_settings
  FROM public.site_settings
  ORDER BY created_at ASC
  LIMIT 1;

  v_method := lower(COALESCE(NULLIF(trim(p_payment_method), ''), 'cod'));

  IF v_method NOT IN ('cod', 'bkash', 'nagad') THEN
    RAISE EXCEPTION 'Invalid payment method.';
  END IF;

  IF v_method = 'cod' AND COALESCE(v_settings.cod_enabled, true) = false THEN
    RAISE EXCEPTION 'Cash on delivery is unavailable.';
  END IF;

  IF v_method = 'bkash' THEN
    IF COALESCE(v_settings.bkash_enabled, false) = false OR char_length(trim(COALESCE(v_settings.bkash_number, ''))) < 7 THEN
      RAISE EXCEPTION 'bKash payment is unavailable.';
    END IF;
    IF char_length(trim(COALESCE(p_transaction_id, ''))) < 4 THEN
      RAISE EXCEPTION 'Please enter the bKash transaction ID.';
    END IF;
  END IF;

  IF v_method = 'nagad' THEN
    IF COALESCE(v_settings.nagad_enabled, false) = false OR char_length(trim(COALESCE(v_settings.nagad_number, ''))) < 7 THEN
      RAISE EXCEPTION 'Nagad payment is unavailable.';
    END IF;
    IF char_length(trim(COALESCE(p_transaction_id, ''))) < 4 THEN
      RAISE EXCEPTION 'Please enter the Nagad transaction ID.';
    END IF;
  END IF;

  v_payment_status := CASE
    WHEN v_method = 'cod' THEN 'unpaid'
    ELSE 'pending_verification'
  END;

  IF NULLIF(trim(COALESCE(p_promo_code, '')), '') IS NOT NULL THEN
    v_code := upper(trim(p_promo_code));

    SELECT *
    INTO v_promo
    FROM public.commerce_promos
    WHERE upper(code) = v_code
      AND active = true
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at >= now())
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Promo code is not valid.';
    END IF;

    IF v_promo.max_uses IS NOT NULL AND v_promo.usage_count >= v_promo.max_uses THEN
      RAISE EXCEPTION 'Promo code has reached its limit.';
    END IF;
  END IF;

  v_order_number :=
    'ZZ-' || to_char(now(), 'YYMMDD') || '-' ||
    lpad(nextval('public.order_number_seq')::text, 4, '0');

  v_original_total := v_product.price * p_quantity;
  v_final_total := v_original_total;

  IF v_code IS NOT NULL THEN
    IF v_original_total < v_promo.min_order_amount THEN
      RAISE EXCEPTION 'Minimum order amount for this promo is %.', v_promo.min_order_amount;
    END IF;

    v_discount := CASE
      WHEN v_promo.discount_type = 'percent'
        THEN round(v_original_total * LEAST(v_promo.discount_value, 100) / 100, 2)
      ELSE LEAST(v_promo.discount_value, v_original_total)
    END;

    v_final_total := GREATEST(v_original_total - v_discount, 0);

    UPDATE public.commerce_promos
    SET usage_count = usage_count + 1, updated_at = now()
    WHERE id = v_promo.id;
  END IF;

  IF NOT v_is_preorder THEN
    UPDATE public.products
    SET
      quantity_available = quantity_available - p_quantity,
      stock_status = CASE
        WHEN quantity_available - p_quantity <= 0 THEN 'SOLD OUT'
        ELSE stock_status
      END,
      sales_count = COALESCE(sales_count, 0) + p_quantity
    WHERE id = v_product.id;

    IF v_color IS NOT NULL THEN
      UPDATE public.products
      SET color_stock = jsonb_set(
        COALESCE(color_stock, '{}'::jsonb),
        ARRAY[v_color],
        to_jsonb(v_color_available - p_quantity),
        true
      )
      WHERE id = v_product.id;
    END IF;
  ELSE
    UPDATE public.products
    SET sales_count = COALESCE(sales_count, 0) + p_quantity
    WHERE id = v_product.id;
  END IF;

  INSERT INTO public.orders (
    order_number, source, status, customer_name, phone, delivery_address,
    map_url, latitude, longitude, customer_note, product_id, product_name,
    product_code, unit_price, quantity, selected_size, selected_finish,
    selected_color, subtotal_price, discount_amount, promo_code, total_price,
    payment_method, payment_status, transaction_id, customer_email
  )
  VALUES (
    v_order_number, v_order_source, v_order_status, trim(p_customer_name), trim(p_phone),
    trim(p_address), NULLIF(trim(COALESCE(p_map_url, '')), ''), p_latitude,
    p_longitude, NULLIF(trim(COALESCE(p_note, '')), ''), v_product.id,
    v_product.name, v_product.product_code, v_product.price, p_quantity,
    NULLIF(trim(COALESCE(p_size, '')), ''),
    NULLIF(trim(COALESCE(p_finish, '')), ''), v_color,
    v_original_total, v_discount, v_code, v_final_total,
    v_method, v_payment_status, NULLIF(trim(COALESCE(p_transaction_id, '')), ''), v_email
  )
  RETURNING id INTO v_order_id;

  IF to_regclass('public.commerce_notification_events') IS NOT NULL THEN
    INSERT INTO public.commerce_notification_events (
      order_id, order_number, event_type, phone, email, payload, delivery_status
    )
    VALUES (
      v_order_id,
      v_order_number,
      CASE WHEN v_is_preorder THEN 'preorder_received' ELSE 'order_received' END,
      trim(p_phone),
      COALESCE(v_email, ''),
      jsonb_build_object(
        'order_number', v_order_number,
        'source', v_order_source,
        'status', v_order_status,
        'product_name', v_product.name,
        'product_code', v_product.product_code,
        'quantity', p_quantity,
        'total_price', v_final_total,
        'promo_code', v_code,
        'discount_amount', v_discount,
        'selected_color', v_color
      ),
      'queued'
    );
  END IF;

  RETURN QUERY SELECT v_order_number, v_final_total, v_discount, v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.create_commerce_order(
  uuid, text, text, text, text, text, text, integer,
  text, numeric, numeric, text, text, text, text, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_commerce_order(
  uuid, text, text, text, text, text, text, integer,
  text, numeric, numeric, text, text, text, text, text
) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.track_public_order(text, text);

CREATE FUNCTION public.track_public_order(p_order_number text, p_phone text)
RETURNS TABLE(
  order_number text,
  source text,
  status text,
  payment_method text,
  payment_status text,
  product_name text,
  product_code text,
  quantity integer,
  selected_size text,
  selected_finish text,
  selected_color text,
  subtotal_price numeric,
  discount_amount numeric,
  promo_code text,
  total_price numeric,
  created_at timestamptz,
  confirmed_at timestamptz,
  processing_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
BEGIN
  RETURN QUERY
  SELECT
    o.order_number,
    o.source,
    o.status,
    o.payment_method,
    o.payment_status,
    o.product_name,
    o.product_code,
    o.quantity,
    o.selected_size,
    o.selected_finish,
    o.selected_color,
    o.subtotal_price,
    o.discount_amount,
    o.promo_code,
    o.total_price,
    o.created_at,
    o.confirmed_at,
    o.processing_at,
    o.shipped_at,
    o.delivered_at,
    o.cancelled_at
  FROM public.orders o
  WHERE lower(o.order_number) = lower(trim(COALESCE(p_order_number, '')))
    AND regexp_replace(COALESCE(o.phone, ''), '\D', '', 'g') = v_phone
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.track_public_order(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_public_order(text, text) TO anon, authenticated, service_role;
