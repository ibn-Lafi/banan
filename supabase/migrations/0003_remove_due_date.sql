-- ============================================================================
-- إزالة تاريخ الاستحقاق ومفهوم "الفاتورة المتأخرة" من النظام بالكامل.
-- الفاتورة الآجلة تبقى بحالة issued (أو partially_paid) إلى أن تُسدَّد
-- بالكامل، بدون موعد نهائي أو حالة "متأخرة" — متى ما دفع العميل، دفع.
-- ============================================================================

-- 1) تحويل أي فاتورة بحالة due/overdue القديمة إلى issued قبل تطبيق القيد الجديد
update public.invoices set status = 'issued' where status in ('due', 'overdue');

-- 2) تحديث قيد الحالات المسموح بها على عمود status
alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check
  check (status in ('draft', 'issued', 'partially_paid', 'paid', 'cancelled'));

-- 3) حذف عمود تاريخ الاستحقاق نهائياً
alter table public.invoices drop column if exists due_date;
