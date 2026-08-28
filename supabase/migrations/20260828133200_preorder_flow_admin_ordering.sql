-- ZZERKOFF PRE-ORDER FLOW + PRODUCT ORDERING
-- Run in Supabase/Lovable SQL editor to activate database-side behavior.
-- App-side admin UI is already safe; this migration makes new orders source='preorder'
-- and prevents PRE-ORDER products from reducing stock.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sales_count integer NOT NULL DEFAULT 0;

UPDATE public.products p
SET sales_count = COALESCE(stats.sold_qty, 0)
FROM (
  SELECT product_id, COALESCE(SUM(quantity), 0)::integer AS sold_qty
  FROM public.orders
  WHERE product_id IS NOT NULL
    AND status IS DISTINCT FROM 'cancelled'
  GROUP BY product_id
) stats
WHERE p.id = stats.product_id;

-- Payment-aware public order function: PRE-ORDER products do not consume stock.
CREATE OR REPLACE FUNCTION public.create_public_order(
  p_product_id uuid,
  p_customer_name text,
  p_phone text,
  p_address text,
  p_size text,
  p_finish text,
  p_quantity integer,
  p_map_url text,
  p_latitude numeric,
  p_longitude numeric,
  p_note text,
  p_payment_method text,
  p_transaction_id text
)
RETURNS TABLE(order_number text, total_price numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_settings public.site_settings%ROWTYPE;
  v_order_number text;
  v_total numeric;
  v_method text;
  v_payment_status text;
  v_is_preorder boolean := false;
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

  v_is_preorder := v_product.stock_status = 'PRE-ORDER';

  IF NOT v_is_preorder AND (
     v_product.stock_status = 'SOLD OUT'
     OR v_product.quantity_available <= 0
     OR p_quantity > v_product.quantity_available
  ) THEN
    RAISE EXCEPTION 'Requested quantity is not available.';
  END IF;

  IF COALESCE(array_length(v_product.sizes, 1), 0) > 0
     AND NOT (COALESCE(p_size, '') = ANY(v_product.sizes)) THEN
    RAISE EXCEPTION 'Please select a valid size.';
  END IF;

  IF COALESCE(array_length(v_product.finish, 1), 0) > 0
     AND NOT (COALESCE(p_finish, '') = ANY(v_product.finish)) THEN
    RAISE EXCEPTION 'Please select a valid finish.';
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

  v_order_number :=
    'ZZ-' || to_char(now(), 'YYMMDD') || '-' ||
    lpad(nextval('public.order_number_seq')::text, 4, '0');

  v_total := v_product.price * p_quantity;

  UPDATE public.products
  SET
    quantity_available = CASE
      WHEN v_is_preorder THEN quantity_available
      ELSE quantity_available - p_quantity
    END,
    stock_status = CASE
      WHEN v_is_preorder THEN 'PRE-ORDER'
      WHEN quantity_available - p_quantity <= 0 THEN 'SOLD OUT'
      ELSE stock_status
    END,
    sales_count = COALESCE(sales_count, 0) + p_quantity,
    sort_order = CASE
      WHEN COALESCE(sort_order, 0) <= 0 THEN -1 * (COALESCE(sales_count, 0) + p_quantity)
      ELSE sort_order
    END
  WHERE id = v_product.id;

  INSERT INTO public.orders (
    order_number, source, status, customer_name, phone, delivery_address,
    map_url, latitude, longitude, customer_note, product_id, product_name,
    product_code, unit_price, quantity, selected_size, selected_finish,
    total_price, payment_method, payment_status, transaction_id
  )
  VALUES (
    v_order_number,
    CASE WHEN v_is_preorder THEN 'preorder' ELSE 'website' END,
    'new', trim(p_customer_name), trim(p_phone), trim(p_address),
    NULLIF(trim(COALESCE(p_map_url, '')), ''), p_latitude, p_longitude,
    CASE
      WHEN v_is_preorder THEN NULLIF(trim('[PRE-ORDER] ' || COALESCE(p_note, '')), '[PRE-ORDER]')
      ELSE NULLIF(trim(COALESCE(p_note, '')), '')
    END,
    v_product.id, v_product.name, v_product.product_code, v_product.price, p_quantity,
    NULLIF(trim(COALESCE(p_size, '')), ''),
    NULLIF(trim(COALESCE(p_finish, '')), ''), v_total,
    v_method, v_payment_status, NULLIF(trim(COALESCE(p_transaction_id, '')), '')
  );

  RETURN QUERY SELECT v_order_number, v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_order(
  uuid, text, text, text, text, text, integer, text, numeric, numeric, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_order(
  uuid, text, text, text, text, text, integer, text, numeric, numeric, text, text, text
) TO anon, authenticated, service_role;

-- Backward-compatible wrapper.
CREATE OR REPLACE FUNCTION public.create_public_order(
  p_product_id uuid,
  p_customer_name text,
  p_phone text,
  p_address text,
  p_size text,
  p_finish text,
  p_quantity integer,
  p_map_url text,
  p_latitude numeric,
  p_longitude numeric,
  p_note text
)
RETURNS TABLE(order_number text, total_price numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.create_public_order(
    p_product_id, p_customer_name, p_phone, p_address, p_size, p_finish,
    p_quantity, p_map_url, p_latitude, p_longitude, p_note, 'cod', NULL
  );
$$;

REVOKE ALL ON FUNCTION public.create_public_order(
  uuid, text, text, text, text, text, integer, text, numeric, numeric, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_order(
  uuid, text, text, text, text, text, integer, text, numeric, numeric, text
) TO anon, authenticated, service_role;

-- Commerce order function: color stock is skipped for PRE-ORDER products.
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
  v_order_number text;
  v_original_total numeric;
  v_final_total numeric;
  v_discount numeric := 0;
  v_code text := NULL;
  v_color text := NULLIF(trim(COALESCE(p_color, '')), '');
  v_color_available integer := 0;
  v_promo public.commerce_promos%ROWTYPE;
  v_is_preorder boolean := false;
BEGIN
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

  v_is_preorder := v_product.stock_status = 'PRE-ORDER';

  IF COALESCE(array_length(v_product.colors, 1), 0) > 0 THEN
    IF v_color IS NULL OR NOT (v_color = ANY(v_product.colors)) THEN
      RAISE EXCEPTION 'Please select a valid color.';
    END IF;

    v_color_available := COALESCE((v_product.color_stock ->> v_color)::integer, 0);

    IF NOT v_is_preorder AND v_color_available < p_quantity THEN
      RAISE EXCEPTION 'Requested quantity is not available in %.', v_color;
    END IF;
  ELSE
    v_color := NULL;
  END IF;

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

  SELECT result.order_number, result.total_price
  INTO v_order_number, v_original_total
  FROM public.create_public_order(
    p_product_id,
    p_customer_name,
    p_phone,
    p_address,
    p_size,
    p_finish,
    p_quantity,
    p_map_url,
    p_latitude,
    p_longitude,
    p_note,
    p_payment_method,
    p_transaction_id
  ) AS result;

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

  IF v_color IS NOT NULL AND NOT v_is_preorder THEN
    UPDATE public.products
    SET color_stock = jsonb_set(
      COALESCE(color_stock, '{}'::jsonb),
      ARRAY[v_color],
      to_jsonb(v_color_available - p_quantity),
      true
    )
    WHERE id = p_product_id;
  END IF;

  UPDATE public.orders
  SET
    selected_color = v_color,
    subtotal_price = v_original_total,
    discount_amount = v_discount,
    promo_code = v_code,
    total_price = v_final_total,
    customer_email = COALESCE(NULLIF(trim(COALESCE(p_customer_email, '')), ''), customer_email)
  WHERE order_number = v_order_number;

  UPDATE public.commerce_notification_events
  SET
    email = COALESCE(NULLIF(trim(COALESCE(p_customer_email, '')), ''), email),
    payload = payload || jsonb_build_object(
      'total_price', v_final_total,
      'promo_code', v_code,
      'discount_amount', v_discount,
      'selected_color', v_color,
      'source', CASE WHEN v_is_preorder THEN 'preorder' ELSE 'website' END
    )
  WHERE order_number = v_order_number
    AND event_type = 'order_received'
    AND delivery_status = 'queued';

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
