-- وحدة قياس المنتج (بوكس / علبة / كرتون ...) — كيان تنظيمي مشترك بنفس نمط
-- categories، تُختار عند إضافة المنتج وتُحفظ كـ snapshot في بند الفاتورة حتى
-- تبقى ثابتة حتى لو تغيّرت أو حُذفت لاحقاً.
create table public.units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now()
);

create index idx_units_company on public.units (company_id);

alter table public.products
  add column unit_id uuid references public.units (id) on delete set null;

alter table public.invoice_items
  add column unit_name_snapshot text;

alter table public.units enable row level security;

create policy tenant_isolation_units on public.units
  for all using (company_id = public.current_company_id());
