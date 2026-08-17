-- حالة الصنف المرتجع (سليم يرجع للمخزن / تالف) — حقل معلوماتي على بند المرتجع.
alter table public.return_items
  add column condition text check (condition in ('sound', 'damaged'));
