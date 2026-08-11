-- SKU لم يعد إلزامياً عند إضافة منتج — القيد (company_id, sku) الحالي في
-- Postgres يسمح أصلاً بتكرار NULL عدة مرات، فلا حاجة لتعديله.
alter table public.products alter column sku drop not null;
