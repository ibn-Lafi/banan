-- المدن: كيان تنظيمي مشترك بنفس نمط categories/units — تُستخدم لتصنيف
-- العملاء جغرافياً وتصفيتهم حسب المدينة.
create table public.cities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now()
);

create index idx_cities_company on public.cities (company_id);

alter table public.customers
  add column city_id uuid references public.cities (id) on delete set null,
  add column maps_url text;

alter table public.cities enable row level security;

create policy tenant_isolation_cities on public.cities
  for all using (company_id = public.current_company_id());

-- أحجام/مقاسات المنتج (صغير/وسط/كبير...) — كل حجم له سعره الخاص. المنتج بدون
-- أي حجم مسجَّل يستمر يستخدم سعره الأساسي كما هو (لا كسر توافق).
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  price_gross numeric(12, 2) not null check (price_gross >= 0),
  created_at timestamptz not null default now()
);

create index idx_product_variants_product on public.product_variants (product_id);

alter table public.invoice_items
  add column variant_id uuid references public.product_variants (id) on delete set null,
  add column variant_name_snapshot text;

alter table public.product_variants enable row level security;

create policy tenant_isolation_product_variants on public.product_variants
  for all using (
    product_id in (select id from public.products where company_id = public.current_company_id())
  );
