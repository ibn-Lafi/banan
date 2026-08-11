-- حالة جديدة "returned" (مرتجع): فاتورة صار عليها مرتجع لكنها لم تُدفع بعد ولو
-- جزئياً — تُميَّز عن "issued" (جديدة، بدون أي مرتجع أو دفعة) و"partially_paid".
alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check
  check (status in ('draft', 'issued', 'partially_paid', 'returned', 'paid', 'cancelled'));
