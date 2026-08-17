-- ملاحظات الفاتورة (شروط الاستبدال/الاسترجاع وغيرها) تُدخل عند إنشاء الفاتورة وتُحفظ معها.
alter table public.invoices
  add column notes text null;
