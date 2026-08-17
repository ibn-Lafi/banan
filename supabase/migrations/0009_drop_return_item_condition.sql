-- النظام لا يحتوي على إدارة مخزون فعلية؛ حذف حقل حالة المرتجع (سليم/تالف)
-- الذي كان يشير إلى مفهوم "يرجع للمخزن" غير موجود في النظام.
alter table public.return_items
  drop column if exists condition;
