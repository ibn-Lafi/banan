# بنان — نظام إدارة مبيعات وفوترة للمناديب

تطبيق Monorepo مبني حسب `SPEC.md`. لا يزال في مرحلة MVP الأولى — راجع
`SPEC.md` لكل تفاصيل المتطلبات والقرارات المفتوحة (Open Decisions).

## البنية

```
apps/
  web/        Next.js 14 (App Router) + TypeScript + Tailwind — RTL/عربي أولاً
  api/        Node.js + Express + TypeScript — REST API
packages/
  types/      TypeScript interfaces مشتركة
  validation/ Zod schemas مشتركة (نفس التحقق في web وapi)
  shared/     منطق حساب الضريبة، التقريب، ترقيم المستندات، QR ZATCA
supabase/
  migrations/ SQL Schema + RLS + Storage buckets
```

## المتطلبات

- Node.js 20+
- pnpm (`corepack enable` أو `npm i -g pnpm`)
- مشروع Supabase (قاعدة بيانات + Auth + Storage)

## الإعداد المحلي

```bash
pnpm install

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# عدّل القيم في الملفين حسب مشروع Supabase الخاص بك (انظر أدناه)

pnpm dev:api   # http://localhost:4000
pnpm dev:web   # http://localhost:3000
```

## إعداد Supabase

1. أنشئ مشروعاً جديداً على [supabase.com](https://supabase.com).
2. من **SQL Editor**، شغّل الملفات بالترتيب:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_storage.sql`
   - `supabase/migrations/0003_remove_due_date.sql`
3. من **Settings → API** انسخ:
   - `Project URL` → `SUPABASE_URL`
   - `anon public key` → `SUPABASE_ANON_KEY`
   - `service_role key` (سري جداً) → `SUPABASE_SERVICE_ROLE_KEY`
4. اختر رمزاً سرياً عشوائياً واضبطه كـ `SETUP_TOKEN` في بيئة الـ API.
5. افتح `/setup` في الـ Frontend (مرة واحدة فقط) — صفحة إعداد أولي تُنشئ أول
   شركة وأول مستخدم Admin بنموذج عادي بدون أي SQL يدوي. تُقفل تلقائياً بعد
   أول استخدام ناجح.

> ملاحظة معمارية: نستخدم Supabase Auth مع بريد داخلي مُشتق من `user.id`
> (وليس username) — راجع OD-2 وتعليقات `authService.ts`.

## إعداد Railway

المشروع Monorepo بخدمتين منفصلتين على نفس المستودع — `apps/api` و`apps/web`،
كل واحدة لها `railway.json` بأوامر Build/Start الصحيحة (لا تحتاج لتعديلها،
فقط أنشئ خدمتين من نفس الـ Repo واختر مجلد كل خدمة كـ Root Directory):

**خدمة API** (`apps/api`):
- Root Directory: `apps/api`
- Build/Start Command: تُقرأ تلقائياً من `apps/api/railway.json`
- متغيرات البيئة: نفس محتوى `apps/api/.env.example` (`SUPABASE_URL`,
  `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SETUP_TOKEN`,
  `CORS_ORIGIN` = رابط خدمة الـ web بعد نشرها)

**خدمة Web** (`apps/web`):
- Root Directory: `apps/web`
- Build/Start Command: تُقرأ تلقائياً من `apps/web/railway.json`
- متغيرات البيئة: `NEXT_PUBLIC_API_URL` = رابط خدمة الـ API بعد نشرها
  (⚠️ يجب ضبطها **قبل** أول Build لأن Next.js يُضمّنها وقت البناء، وليس وقت التشغيل)

بعد نجاح النشر: افتح رابط خدمة الـ web على `/setup` لإتمام الإعداد الأولي.

## الحالة الحالية

- ✅ Schema + RLS + ترقيم مستندات atomic
- ✅ منطق الضريبة/التقريب/الرصيد (مُختبر في `packages/shared`)
- ✅ API: auth, customers, products, categories, invoices (draft/issue/cancel),
  payments, returns, reports, users, audit-logs, company-settings
- ✅ Web: تسجيل دخول، Dashboard، عملاء، منتجات + تصنيفات، فاتورة (إنشاء/مراجعة/إصدار/دفعة)،
  تقارير، مستخدمون، سجل عمليات، إعدادات شركة — Responsive (Bottom Nav / Sidebar)
- ✅ توليد PDF فعلي للفاتورة (OD-11): `@react-pdf/renderer` + خط Cairo عربي
  مُضمَّن (Arabic+Latin مدموجين لدعم التشكيل الصحيح) + QR بصيغة ZATCA Phase 1،
  يُحفظ في Supabase Storage (`invoice-pdfs`) ويُعاد توليده في كل طلب ليعكس
  آخر رصيد (مرتجعات/دفعات). زر "عرض/تحميل PDF" في صفحة تفاصيل الفاتورة.
- ⚠️ **قرار منتج (يخالف SPEC.md §8/§11):** لا يوجد تاريخ استحقاق (`due_date`)
  ولا حالتا `due`/`overdue` في هذا النظام — الفاتورة الآجلة تبقى `issued` أو
  `partially_paid` إلى أن تُسدَّد بالكامل، بدون موعد نهائي. طُبِّق هذا عبر
  `supabase/migrations/0003_remove_due_date.sql` وحذف الحقل من كل الطبقات.
- ⏳ غير مُنفَّذ بعد: رفع شعار الشركة لـ Storage (منطق دمجه بالـ PDF جاهز إن
  توفر `logo_url`)، شاشة إنشاء مرتجع من واجهة الفاتورة، Offline handling،
  اختبارات API/E2E
