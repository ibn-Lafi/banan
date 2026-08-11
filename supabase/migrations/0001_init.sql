-- ============================================================================
-- Banan — Sales & Invoicing System for Field Reps
-- Migration 0001: Initial schema (SPEC.md section 17)
--
-- ملاحظة معمارية (OD-2): المصادقة تعتمد على Supabase Auth، حيث username
-- يُخزَّن كبريد داخلي وهمي (username@company.internal) في auth.users.
-- جدول public.users هو "profile" يمتد من auth.users بنفس الـ id (1:1)،
-- ولذلك لا يوجد عمود password_hash هنا — Supabase Auth يدير كلمات المرور.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vat_number text,
  cr_number text,
  phone text,
  email text,
  address text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- users (profile 1:1 مع auth.users)
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete restrict,
  username text not null,
  full_name text not null,
  role text not null check (role in ('admin', 'rep')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, username)
);

create index idx_users_company on public.users (company_id);

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  name text not null,
  vat_number text,
  cr_number text,
  phone text,
  email text,
  address text,
  notes text,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_customers_company on public.customers (company_id);
create index idx_customers_search on public.customers (company_id, name, phone, vat_number, cr_number);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now()
);

create index idx_categories_company on public.categories (company_id);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  sku text not null,
  price_gross numeric(12, 2) not null check (price_gross >= 0),
  vat_rate numeric(5, 4) not null default 0.15 check (vat_rate >= 0 and vat_rate <= 1),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, sku)
);

create index idx_products_company on public.products (company_id);
create index idx_products_search on public.products (company_id, name, sku);

-- ---------------------------------------------------------------------------
-- document_sequences (ترقيم ذري لكل company_id + document_type)
-- ---------------------------------------------------------------------------
create table public.document_sequences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  document_type text not null check (document_type in ('invoice', 'return', 'payment')),
  last_number integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (company_id, document_type)
);

-- توليد الرقم التالي بشكل atomic عبر INSERT ... ON CONFLICT DO UPDATE
-- (يمنع تكرار الأرقام عند إصدار فواتير متزامنة — القسم 15 وPre-Implementation Review #3)
create or replace function public.next_document_number(p_company_id uuid, p_document_type text)
returns integer
language plpgsql
as $$
declare
  v_next integer;
begin
  insert into public.document_sequences (company_id, document_type, last_number)
  values (p_company_id, p_document_type, 1)
  on conflict (company_id, document_type)
  do update set last_number = public.document_sequences.last_number + 1, updated_at = now()
  returning last_number into v_next;

  return v_next;
end;
$$;

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  invoice_number text,
  invoice_type text not null default 'standard' check (invoice_type in ('standard', 'simplified')),
  customer_id uuid not null references public.customers (id),
  rep_id uuid not null references public.users (id),
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'due', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  invoice_date date not null default current_date,
  due_date date,
  original_amount_gross numeric(12, 2) not null default 0,
  original_amount_net numeric(12, 2) not null default 0,
  original_vat_amount numeric(12, 2) not null default 0,
  current_amount_gross numeric(12, 2) not null default 0,
  qr_code_payload text,
  issued_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, invoice_number)
);

create index idx_invoices_company on public.invoices (company_id);
create index idx_invoices_customer on public.invoices (customer_id);
create index idx_invoices_rep on public.invoices (rep_id);
create index idx_invoices_status on public.invoices (status);
create index idx_invoices_date on public.invoices (invoice_date);

-- ---------------------------------------------------------------------------
-- invoice_items
-- ---------------------------------------------------------------------------
create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  product_id uuid not null references public.products (id),
  product_name_snapshot text not null,
  quantity numeric(12, 3) not null check (quantity > 0),
  product_base_price numeric(12, 2) not null,
  unit_price numeric(12, 2) not null check (unit_price > 0),
  vat_rate numeric(5, 4) not null,
  line_net numeric(12, 2) not null,
  line_vat numeric(12, 2) not null,
  line_gross numeric(12, 2) not null,
  returned_quantity numeric(12, 3) not null default 0
);

create index idx_invoice_items_invoice on public.invoice_items (invoice_id);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  payment_number text,
  invoice_id uuid not null references public.invoices (id),
  customer_id uuid not null references public.customers (id),
  amount numeric(12, 2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text,
  notes text,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  unique (company_id, payment_number)
);

create index idx_payments_company on public.payments (company_id);
create index idx_payments_invoice on public.payments (invoice_id);
create index idx_payments_customer on public.payments (customer_id);

-- payment_allocations (جاهز لدعم دفعة موزعة على أكثر من فاتورة — OD-12، غير مفعّل منطقياً في MVP)
create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id),
  allocated_amount numeric(12, 2) not null check (allocated_amount > 0)
);

create index idx_payment_allocations_payment on public.payment_allocations (payment_id);
create index idx_payment_allocations_invoice on public.payment_allocations (invoice_id);

-- ---------------------------------------------------------------------------
-- returns
-- ---------------------------------------------------------------------------
create table public.returns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  return_number text,
  invoice_id uuid not null references public.invoices (id),
  rep_id uuid not null references public.users (id),
  return_date date not null default current_date,
  total_amount_gross numeric(12, 2) not null default 0,
  total_amount_net numeric(12, 2) not null default 0,
  total_vat_amount numeric(12, 2) not null default 0,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  unique (company_id, return_number)
);

create index idx_returns_company on public.returns (company_id);
create index idx_returns_invoice on public.returns (invoice_id);

-- ---------------------------------------------------------------------------
-- return_items
-- ---------------------------------------------------------------------------
create table public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.returns (id) on delete cascade,
  invoice_item_id uuid not null references public.invoice_items (id),
  returned_quantity numeric(12, 3) not null check (returned_quantity > 0),
  unit_price_at_return numeric(12, 2) not null,
  line_net numeric(12, 2) not null,
  line_vat numeric(12, 2) not null,
  line_gross numeric(12, 2) not null
);

create index idx_return_items_return on public.return_items (return_id);
create index idx_return_items_invoice_item on public.return_items (invoice_item_id);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete restrict,
  user_id uuid not null references public.users (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_company on public.audit_logs (company_id);
create index idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);
create index idx_audit_logs_created_at on public.audit_logs (created_at);

-- ============================================================================
-- Row Level Security (OD-14: RLS كطبقة دفاع إضافية على company_id فقط؛
-- التحقق التفصيلي من صلاحيات Rep/Admin يبقى في Backend، لأن الـ API يستخدم
-- Service Role Key الذي يتجاوز RLS. هذه السياسات تحمي أي وصول مباشر مستقبلي
-- من الـ Frontend (مثل Storage أو Realtime) عبر anon/authenticated key.
-- ============================================================================

alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.returns enable row level security;
alter table public.return_items enable row level security;
alter table public.document_sequences enable row level security;
alter table public.audit_logs enable row level security;

-- دالة مساعدة: company_id للمستخدم الحالي المسجّل دخوله عبر Supabase Auth
create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.users where id = auth.uid();
$$;

create policy tenant_isolation_companies on public.companies
  for all using (id = public.current_company_id());

create policy tenant_isolation_users on public.users
  for all using (company_id = public.current_company_id());

create policy tenant_isolation_customers on public.customers
  for all using (company_id = public.current_company_id());

create policy tenant_isolation_categories on public.categories
  for all using (company_id = public.current_company_id());

create policy tenant_isolation_products on public.products
  for all using (company_id = public.current_company_id());

create policy tenant_isolation_invoices on public.invoices
  for all using (company_id = public.current_company_id());

create policy tenant_isolation_invoice_items on public.invoice_items
  for all using (
    invoice_id in (select id from public.invoices where company_id = public.current_company_id())
  );

create policy tenant_isolation_payments on public.payments
  for all using (company_id = public.current_company_id());

create policy tenant_isolation_payment_allocations on public.payment_allocations
  for all using (
    invoice_id in (select id from public.invoices where company_id = public.current_company_id())
  );

create policy tenant_isolation_returns on public.returns
  for all using (company_id = public.current_company_id());

create policy tenant_isolation_return_items on public.return_items
  for all using (
    return_id in (select id from public.returns where company_id = public.current_company_id())
  );

create policy tenant_isolation_document_sequences on public.document_sequences
  for all using (company_id = public.current_company_id());

create policy tenant_isolation_audit_logs on public.audit_logs
  for all using (company_id = public.current_company_id());

-- ============================================================================
-- updated_at triggers
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_companies_updated_at before update on public.companies
  for each row execute function public.set_updated_at();
create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger trg_customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger trg_products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger trg_invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();
