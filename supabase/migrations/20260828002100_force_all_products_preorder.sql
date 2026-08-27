-- ZZERKOFF: make every product PRE-ORDER.
-- This keeps every object orderable without exposing exact stock to customers.

UPDATE public.products
SET stock_status = 'PRE-ORDER'
WHERE stock_status IS DISTINCT FROM 'PRE-ORDER';
