-- ============================================================================
-- Storage buckets (القسم 14: PDF الفواتير + شعار الشركة)
-- الوصول للملفات يتم عبر Backend (Service Role) بروابط موقّعة (Signed URLs) —
-- القسم 20: Storage آمن. البكتات هنا خاصة (private) وليست public.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('invoice-pdfs', 'invoice-pdfs', false)
on conflict (id) do nothing;

-- لا سياسات وصول مباشر من المتصفح (anon/authenticated) في MVP —
-- كل القراءة/الكتابة تمر عبر Backend باستخدام Service Role Key،
-- والذي يتجاوز RLS/Storage policies تلقائياً. عند الحاجة لاحقاً لروابط
-- موقّعة تُنشأ من Backend عبر createSignedUrl، فلا حاجة لسياسة إضافية هنا.
