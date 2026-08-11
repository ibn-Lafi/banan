# مواصفات المشروع الشاملة
## نظام إدارة مبيعات B2B وفوترة للمناديب (Sales & Invoicing System for Field Reps)

**الحالة:** مسودة ثانية (Draft v2) — بعد حسم قرار ZATCA (OD-10)، بانتظار مراجعة باقي الأقسام والاعتماد النهائي
**النطاق:** توثيق + تحليل + Architecture فقط. لا برمجة في هذه المرحلة.

---

## جدول المحتويات

1. Product Vision
2. Technology & Architecture
3. المستخدمون والصلاحيات (RBAC)
4. بيانات الشركة (Company Settings)
5. العملاء (Customers)
6. المنتجات (Products)
7. التسعير والضريبة (Pricing & VAT)
8. الفواتير (Invoices)
9. الدفعات (Payments)
10. المرتجعات (Returns)
11. الرصيد والمبلغ المطلوب (Balance Logic)
12. كشف حساب العميل (Customer Statement)
13. التقارير (Reports)
14. مواصفات PDF
15. ترقيم المستندات (Numbering)
16. Audit Log
17. Database Schema
18. Multi-Tenant Design
19. API Design
20. الأمان (Security)
21. مكان تنفيذ Business Logic
22. UX/UI والشاشات
23. البحث (Search)
24. التعامل مع ضعف الاتصال (Offline)
25. خطة الاختبارات (Testing)
26. نطاق MVP
27. خارج نطاق MVP
28. Future Roadmap
29. Pre-Implementation Review
30. Open Decisions

---

## 1. Product Vision

### المشكلة
المناديب يحتاجون طريقة سريعة لإصدار فواتير موثوقة أثناء الزيارة الميدانية للعملاء (محلات/شركات)، مع إدارة صحيحة للمرتجعات والدفعات وأرصدة العملاء، دون تعقيد نظام ERP كامل.

### المستخدمون المستهدفون
- **المندوب (Sales Rep):** الاستخدام الأساسي من الجوال، في الميدان.
- **المدير (Admin/Manager):** إشراف، تقارير، إعدادات، صلاحيات كاملة.

### القيمة الأساسية (Core Value)
إصدار فاتورة صحيحة ضريبياً خلال أقل عدد ممكن من الخطوات، مع سجل مالي دقيق (فواتير/مرتجعات/دفعات) يمكن الوثوق به في التقارير وكشوف الحساب.

### المميزات الأساسية (Core Features)
العملاء، المنتجات، الفواتير، الدفعات، المرتجعات، أرصدة العملاء، التقارير، PDF، المستخدمون، سجل العمليات (Audit Log).

### خارج الرؤية (ليس المنتج)
ليس ERP شامل. لا مخزون، لا مشتريات، لا محاسبة عامة (General Ledger) في هذه المرحلة.

### مقاييس النجاح المقترحة (Success Metrics) — Open
انظر قسم Open Decisions (رقم OD-1).

---

## 2. Technology & Architecture

| الطبقة | التقنية |
|---|---|
| Frontend | Next.js + React + TypeScript, Mobile-first, Fully Responsive (جوال + كمبيوتر)، RTL/Arabic-first، تجربة Mobile شبيهة بتطبيق (App-like UI + PWA اختياري) |
| Backend | Node.js + TypeScript, REST API |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage (شعار الشركة، ملفات PDF) |
| Auth | Username + Password (مخصص، فوق Supabase Auth أو نظام خاص — انظر OD-2) |
| Deployment | Railway |

### هيكلة المستودع (Monorepo)

```
apps/
  web/        → Next.js frontend
  api/        → Node.js REST API
packages/
  shared/     → دوال مشتركة (حساب الضريبة، تنسيق الأرقام...)
  types/      → TypeScript types/interfaces مشتركة بين web/api
  validation/ → Zod/Joi schemas مشتركة (نفس قواعد التحقق في Frontend و Backend)
```

**سبب اختيار Monorepo:** الفريق صغير، والمشروع يحتاج مشاركة نفس الـ Types وقواعد الحساب (الضريبة، الترقيم) بين الواجهة والخادم لتفادي التكرار والتعارض. أدوات مقترحة: `pnpm workspaces` أو `Turborepo` (Open — انظر OD-3).

### مبدأ معماري أساسي
كل منطق مالي حساس (ضريبة، ترقيم، إصدار فاتورة، مرتجع، دفعة، رصيد) **يُنفذ فقط في Backend**. الـ Frontend لا يُعتمد عليه في أي حساب نهائي — هو للعرض والتحقق الأولي (UX) فقط.

---

## 3. المستخدمون والصلاحيات (RBAC)

### الأدوار
- **Admin (المدير)**
- **Rep (المندوب)**

### جدول الصلاحيات

| القدرة | Admin | Rep |
|---|:---:|:---:|
| إدارة المستخدمين (إضافة/تعديل/تعطيل/إعادة تعيين كلمة مرور) | ✅ | ❌ |
| إدارة إعدادات الشركة | ✅ | ❌ |
| إضافة/تعديل عملاء | ✅ | ✅ (حسب OD-4) |
| مشاهدة كل العملاء | ✅ | ✅ (العميل كيان مشترك) |
| إضافة/تعديل منتجات | ✅ | ✅ (حسب OD-4) |
| إنشاء وإصدار فواتير | ✅ | ✅ |
| مشاهدة كل الفواتير | ✅ | ❌ (فواتيره فقط) |
| تسجيل دفعة | ✅ | ✅ (لفواتيره فقط) |
| مشاهدة كل الدفعات | ✅ | ❌ (دفعاته فقط) |
| إنشاء مرتجع | ✅ | ✅ (لفواتيره فقط) |
| مشاهدة كل المرتجعات | ✅ | ❌ (مرتجعاته فقط) |
| التقارير | كل المناديب | تقاريره فقط |
| Audit Log | ✅ | ❌ |
| تعديل فاتورة بعد الإصدار | ❌ (يُستخدم الإلغاء/التصحيح) | ❌ |
| حذف فاتورة صادرة | ❌ | ❌ |

**ملاحظة أمان:** كل التحقق من الصلاحيات (Authorization) يتم في Backend بناءً على الـ session/token، وليس اعتماداً على ما يُرسله الـ Frontend.

---

## 4. بيانات الشركة (Company Settings)

حقول: الاسم التجاري، الرقم الضريبي (VAT Number)، السجل التجاري (CR Number)، رقم الجوال، البريد الإلكتروني، العنوان، شعار الشركة (Supabase Storage).

تظهر هذه البيانات في كل الفواتير ومستندات الـ PDF. متاحة للتعديل من Admin فقط.

---

## 5. العملاء (Customers)

**الحقول:** اسم العميل/المنشأة، الرقم الضريبي، السجل التجاري، رقم الجوال، البريد الإلكتروني، العنوان، ملاحظات، الحالة (نشط/موقوف)، `created_by`, `created_at`, `updated_at`.

**قاعدة أساسية:** العميل كيان مركزي مشترك بين كل المناديب، وليس مملوكاً لمندوب واحد. يُسجَّل من أنشأه فقط للتتبع (Audit)، وليس كقيد ملكية يحدد من يراه.

---

## 6. المنتجات (Products)

**الحقول:** اسم المنتج، SKU، التصنيف (Category)، السعر (شامل الضريبة)، نسبة الضريبة (VAT %)، الحالة، `created_by`, `created_at`, `updated_at`.

**ملاحظة:** نسبة الضريبة تُخزَّن على مستوى المنتج (وليست ثابتة عالمياً) لدعم منتجات معفاة أو بنسب مختلفة مستقبلاً، رغم أن MVP يفترض نسبة موحدة (15%) في الغالب — انظر OD-5.

---

## 7. التسعير والضريبة (Pricing & VAT)

### القاعدة الأساسية
كل الأسعار التي يُدخلها المستخدم هي **أسعار نهائية شاملة للضريبة (Gross/Tax-Inclusive)**. لا تُضاف الضريبة فوق السعر المُدخل.

### معادلة الاستخراج

```
Net Price (قبل الضريبة) = Gross Price / (1 + VAT Rate)
VAT Amount               = Gross Price - Net Price
```

**مثال (VAT = 15%):**
```
Gross = 18.00
Net   = 18 / 1.15 = 15.652173...
VAT   = 18 - Net  = 2.347826...
```

### قاعدة التقريب (Rounding)
- التقريب النهائي المعروض والمُخزَّن يكون بـ **2 خانة عشرية** (أقرب هللة/ريال).
- التقريب يتم **على مستوى بند الفاتورة (line item)** أولاً، ثم تُجمع القيم — لتفادي فروقات تراكمية بين مجموع البنود وإجمالي الفاتورة.
- طريقة التقريب المقترحة: `Round Half Up` (الأكثر شيوعاً في نظم الفوترة).
- هذه نقطة حساسة ماليًا ويجب اعتمادها صراحة قبل البرمجة — انظر **OD-6**.

### تعديل السعر داخل الفاتورة
المندوب يستطيع تعديل `Unit Price` بحرية لكل بند في الفاتورة (لا حد أدنى، لا موافقة، لا قائمة أسعار خاصة، لا خصومات في MVP). يُخزَّن دائماً:
- `product_base_price` (السعر الأساسي وقت الفوترة)
- `invoice_item_unit_price` (السعر الفعلي المُستخدم في الفاتورة)

---

## 8. الفواتير (Invoices)

### دورة حياة الفاتورة (خطوات الإنشاء)
اختيار العميل → إضافة منتجات → تحديد الكميات → تحديد سعر الوحدة → حساب الإجمالي/الضريبة → تحديد حالة الدفع → تحديد تاريخ الاستحقاق (إن كانت آجلة) → مراجعة → إصدار → توليد PDF → حفظ.

### حالات الفاتورة (Invoice Status)

| الحالة | الوصف |
|---|---|
| `Draft` | لم تُصدر بعد، قابلة للتعديل الكامل |
| `Issued` | صدرت، رقمها ثابت، غير قابلة للتعديل المباشر |
| `Due` | آجلة ولم يحن تاريخ الاستحقاق بعد |
| `Partially Paid` | تم دفع جزء منها |
| `Paid` | تم سدادها بالكامل (بعد احتساب المرتجعات) |
| `Overdue` | تجاوزت تاريخ الاستحقاق ولم تُسدد بالكامل |
| `Cancelled` | ملغاة (تبقى في السجل ولا تُحذف) |

**المرتجع ليس حالة فاتورة** — هو مستند مستقل مرتبط بفاتورة صادرة سابقاً.

### الفاتورة الآجلة
عند اختيار "آجلة" يجب تحديد `Due Date`. بعد تجاوز هذا التاريخ دون سداد كامل تتحول الحالة إلى `Overdue` مع عرض عدد أيام التأخير (`Invoice Date` → `Due Date` → اليوم).

### قاعدة عدم التعديل بعد الإصدار
- `Draft`: قابلة للتعديل الكامل.
- `Issued`: البيانات المالية الأساسية (المنتجات، الكميات، الأسعار، العميل) **لا تُعدَّل مباشرة**. التصحيح يتم عبر:
  - **إلغاء الفاتورة** (`Cancel`) إن لم يوجد دفع/مرتجع مرتبط بها، أو
  - **مرتجع** لتصحيح الكميات/القيم بعد الإصدار.
  - آلية "تصحيح مباشر بدون إلغاء أو مرتجع" غير معرّفة بعد — انظر **OD-7**.

---

## 9. الدفعات (Payments)

الدفعة كيان مستقل مرتبط بفاتورة وعميل (وليست Boolean على الفاتورة).

**الحقول:** `payment_number`, `customer_id`, `invoice_id`, `amount`, `payment_date`, `payment_method` (اختياري), `notes`, `created_by`, `created_at`.

### الدفع الجزئي
```
فاتورة = 1,000
دفعة 1 = 400  → المتبقي = 600
دفعة 2 = 300  → المتبقي = 300
دفعة 3 = 300  → المتبقي = 0 → الحالة = Paid
```

**قاعدة تحقق مهمة:** يجب منع تسجيل دفعة تجعل إجمالي المدفوعات على الفاتورة يتجاوز `Current Invoice Amount` (بعد المرتجعات) — إلا إذا قررنا لاحقاً السماح بدفعات زائدة (Overpayment/Credit) — انظر **OD-8**.

---

## 10. المرتجعات (Returns)

### القاعدة الأساسية
المرتجع يُنشأ دائماً استناداً لفاتورة صادرة سابقة. لا يُعدّل الفاتورة الأصلية بشكل مدمّر — يُنشئ سجلاً مستقلاً ويُحدّث الأرقام المُشتقة فقط.

### خطوات الإنشاء
اختيار فاتورة سابقة → عرض تفاصيلها → اختيار المنتجات والكميات المرتجعة → حساب قيمة المرتجع والضريبة المرتبطة → إنشاء مستند `Return` → تحديث الأرقام المشتقة للفاتورة.

### مثال
```
الفاتورة الأصلية: كيك × 10 = 180 ريال
المرتجع: كيك × 2 = 36 ريال
Current Invoice Amount = 180 - 36 = 144 ريال
```

### أكثر من مرتجع لنفس الفاتورة
مسموح، بشرط ألا يتجاوز مجموع الكميات المرتجعة الكمية الأصلية لكل بند.

```
الفاتورة: 10 قطع
مرتجع 1: 2  → المتبقي القابل للإرجاع = 8
مرتجع 2: 3  → المتبقي القابل للإرجاع = 5
```

يجب منع أي مرتجع يتجاوز `remaining returnable quantity` على مستوى **كل بند فاتورة** (وليس فقط إجمالي الفاتورة) — هذا يتطلب قيد تحقق على مستوى `invoice_item`.

### المرتجع لا يعني استرداد نقدي تلقائي
حدوث مرتجع لا يُنشئ تلقائياً حركة دفع/استرداد. الاسترداد النقدي (إن حصل) يُسجَّل كعملية منفصلة صريحة. هذا يمنع تلوّث الرصيد بافتراضات غير حقيقية.

---

## 11. الرصيد والمبلغ المطلوب (Balance Logic)

### المعادلات الأساسية (لكل فاتورة)
```
Current Invoice Amount = Original Invoice Amount − Total Returns
Outstanding Amount      = Current Invoice Amount − Payments Allocated
```

### مثال شامل
```
Original:  1,000 SAR
Returns:     200 SAR
Current:     800 SAR
Payments:    300 SAR
Outstanding: 500 SAR
```

### الحالات التي يجب أن يعمل فيها المنطق بشكل صحيح
- دفع كامل ثم مرتجع لاحقاً.
- مرتجع قبل أي دفعة.
- دفع جزئي ثم مرتجع.
- أكثر من مرتجع وأكثر من دفعة على نفس الفاتورة.

**القاعدة الحاكمة:** الرصيد (Balance) يُشتق دائماً من **الحركات الفعلية المسجلة** (فواتير + مرتجعات + دفعات) وليس من حقل مُخزَّن يُحدَّث يدوياً — لتفادي عدم الاتساق. يُنصح بتصميم "Ledger" مبني على أحداث (event-sourced) — انظر القسم 17 وOD-9 لتحديد إن كان Ledger جدولاً فعلياً أم View محسوب.

---

## 12. كشف حساب العميل (Customer Statement)

عند فتح صفحة العميل تظهر:
- الرصيد الحالي، إجمالي الفواتير، إجمالي المرتجعات، إجمالي المدفوعات، المبلغ المطلوب، المبالغ المتأخرة.
- **Ledger زمني**، مثال:
```
Invoice  +1,000
Return     -200
Payment    -300
Balance  =  500
```

يجب إمكانية توليد **Customer Statement PDF** لفترة محددة (انظر قسم 22 الأصلي → التقارير).

---

## 13. التقارير (Reports)

**نطاق الرؤية:** المندوب يرى تقاريره فقط، المدير يرى الكل.

**فلاتر زمنية:** اليوم، هذا الأسبوع، هذا الشهر، الشهر الماضي، آخر 3 أشهر، السنة، فترة مخصصة.

**فلاتر إضافية:** العميل، المندوب، حالة الفاتورة.

**المخرجات:** إجمالي الفواتير، إجمالي المبيعات، إجمالي المرتجعات، إجمالي المدفوعات، إجمالي المبلغ المطلوب، عدد الفواتير/المرتجعات/الدفعات.

**تقرير عميل حسب الفترة:** يعرض Original Invoices, Returns, Payments, Outstanding لفترة مختارة، مع إمكانية تصديره كـ Customer Statement PDF.

---

## 14. مواصفات PDF

كل فاتورة صادرة تُنتج PDF يحتوي:

شعار الشركة، الاسم التجاري، الرقم الضريبي، السجل التجاري، بيانات العميل، رقم الفاتورة، تاريخ الفاتورة، تاريخ الاستحقاق، جدول المنتجات (الكمية، سعر الوحدة، السعر قبل الضريبة، قيمة الضريبة، الإجمالي شامل الضريبة)، حالة الدفع، QR عند الحاجة (انظر OD-10 حول ZATCA)، وأي بيانات نظامية.

**إن تأثرت الفاتورة بمرتجع:** يجب عرض Original Amount, Returns, Current Amount, Paid, Outstanding بوضوح ضمن نفس PDF (أو ملحق مرتبط به).

**تقني:**
- التوليد **Server-side** (وليس في المتصفح) لضمان عدم التلاعب.
- الحفظ في Supabase Storage — يبقى محفوظاً حتى لو حذف المستخدم النسخة من جهازه.
- إمكانية فتح/تحميل/حفظ/مشاركة عبر نظام مشاركة الجهاز (Web Share API)، بدون WhatsApp API في MVP.
- المكتبة المقترحة للتوليد (Puppeteer / react-pdf / وغيرها) — انظر OD-11.

### 14.1 متطلبات ZATCA — Phase 1 (Generation Phase)

**قرار معتمد (كان OD-10):** جميع الفواتير الصادرة يجب أن تكون متوافقة مع **المرحلة الأولى (Phase 1 – Generation)** من نظام الفوترة الإلكترونية السعودي (ZATCA/Fatoora). **لا يوجد ربط API مع زاتكا في MVP** (لا Clearance ولا Reporting) — هذا يُنقل لمرحلة لاحقة (Phase 2) إن قررت الشركة الانتقال له لاحقاً حسب تصنيفها الرسمي من الهيئة (Wave).

**نوع الفاتورة الأساسي:** Standard Tax Invoice (فاتورة ضريبية قياسية B2B) — تتطلب إظهار بيانات العميل الضريبية بشكل واضح.

**الحقول الإلزامية في متن الفاتورة (Human-readable) بالإضافة لما ورد في القسم 14:**
- الرقم التسلسلي الفريد للفاتورة (`invoice_number`، يُغطّى بالفعل).
- تاريخ **ووقت** إصدار الفاتورة (Timestamp كامل وليس تاريخ فقط — يجب تخزين `issued_at` بدقة الثانية).
- اسم البائع (الشركة) ورقمه الضريبي — موجود.
- اسم العميل ورقمه الضريبي (**إلزامي لفاتورة Standard** — انظر OD-15 أدناه لحالة عدم توفره).
- إجمالي الفاتورة شامل الضريبة، إجمالي الضريبة، الإجمالي قبل الضريبة — موجود.
- **QR Code** يحتوي بيانات مشفّرة بصيغة TLV (Tag-Length-Value) ومُرمّزة Base64، تتضمن كحد أدنى:
  1. اسم البائع (Seller Name)
  2. الرقم الضريبي للبائع (VAT Registration Number)
  3. توقيت إصدار الفاتورة (Timestamp، ISO 8601)
  4. إجمالي الفاتورة شامل الضريبة (Invoice Total incl. VAT)
  5. إجمالي مبلغ الضريبة (VAT Total)

**ملاحظات تقنية:**
- توليد QR يتم في Backend وقت الإصدار (`issue`)، ويُخزَّن أو يُعاد توليده عند الحاجة من بيانات الفاتورة المحفوظة (وليس كصورة ثابتة منفصلة تُدار يدوياً).
- بما أننا في Phase 1 فقط بدون تكامل API: **لا يوجد Cryptographic Stamp ولا Invoice Hash Chaining (PIH/ICV) ولا CSID** — هذه عناصر خاصة بـ Phase 2 وخارج النطاق الحالي بالكامل.
- **تنويه غير قانوني (Disclaimer):** هذا تصميم تقني عام مبني على المتطلبات المُعلنة الشائعة لمرحلة التوليد. للتأكد من التطابق الكامل والدقيق مع آخر لوائح هيئة الزكاة والضريبة والجمارك (خصوصاً صيغة QR والحقول الإلزامية الدقيقة لفاتورة Standard)، يُنصح بمراجعة مستشار ضريبي/محاسبي مختص أو الدليل الرسمي لهيئة الزكاة والضريبة والجمارك قبل الإطلاق الفعلي.

---

## 15. ترقيم المستندات (Numbering)

```
الفواتير:   INV-000001, INV-000002 ...
المرتجعات:  RET-000001, RET-000002 ...
الدفعات:    PAY-000001, PAY-000002 ...
```

**قواعد:**
- لا يتكرر رقم مستند.
- لا يُعاد استخدام رقم مستند صادر حتى لو أُلغي.
- الترقيم لكل نوع مستند **مستقل لكل شركة (`company_id`)** لدعم Multi-tenant مستقبلاً.
- يجب أن يكون التوليد **atomic** لمنع تكرار الأرقام عند إنشاء فواتير متزامنة (race condition) — يُقترح استخدام جدول `document_sequences` مع قفل على مستوى الصف (`SELECT ... FOR UPDATE`) أو `sequence` في PostgreSQL لكل (`company_id`, `document_type`).

---

## 16. Audit Log

تُسجَّل كل حركة مهمة: إنشاء/تعديل عميل، إنشاء/تعديل منتج، تعديل سعر منتج، إنشاء فاتورة، تعديل Draft، إصدار فاتورة، إنشاء دفعة، إنشاء مرتجع، إلغاء فاتورة، تعديل بيانات الشركة، إضافة/تعطيل مستخدم.

**الحقول المُخزَّنة:** `user_id`, `action`, `entity_type`, `entity_id`, `timestamp`, `metadata` (JSON)، والقيم السابقة/الجديدة (`old_value` / `new_value`) عند الحاجة.

مثال:
```
أحمد | Changed Invoice Item Price | Original: 18 SAR | New: 12 SAR
```

---

## 17. Database Schema

> ملاحظة: هذه القائمة أساس مقترح وليست نهائية — تُراجَع أثناء التنفيذ.

### الجداول الأساسية

**companies**
`id (PK)`, `name`, `vat_number`, `cr_number`, `phone`, `email`, `address`, `logo_url`, `created_at`, `updated_at`

**users**
`id (PK)`, `company_id (FK)`, `username (unique per company)`, `password_hash`, `full_name`, `role (admin|rep)`, `status (active|disabled)`, `created_at`, `updated_at`

**customers**
`id (PK)`, `company_id (FK)`, `name`, `vat_number`, `cr_number`, `phone`, `email`, `address`, `notes`, `status`, `created_by (FK users)`, `created_at`, `updated_at`

**categories**
`id (PK)`, `company_id (FK)`, `name`, `created_at`

**products**
`id (PK)`, `company_id (FK)`, `category_id (FK)`, `name`, `sku (unique per company)`, `price_gross`, `vat_rate`, `status`, `created_by (FK users)`, `created_at`, `updated_at`

**invoices**
`id (PK)`, `company_id (FK)`, `invoice_number (unique per company)`, `invoice_type (standard|simplified)`, `customer_id (FK)`, `rep_id (FK users)`, `status`, `invoice_date`, `due_date`, `original_amount_gross`, `original_amount_net`, `original_vat_amount`, `current_amount_gross` (مشتق), `qr_code_payload` (نص Base64 المُولَّد وقت الإصدار — يُعاد توليده من البيانات إن فُقد)، `created_at`, `updated_at`, `issued_at` (**Timestamp كامل بدقة الثانية — إلزامي لمتطلبات ZATCA**), `cancelled_at`

**invoice_items**
`id (PK)`, `invoice_id (FK)`, `product_id (FK)`, `product_name_snapshot`, `quantity`, `product_base_price` (سعر المنتج وقت البيع), `unit_price` (السعر الفعلي المُستخدم), `vat_rate`, `line_net`, `line_vat`, `line_gross`, `returned_quantity` (مشتق أو مُحدَّث)

**payments**
`id (PK)`, `company_id (FK)`, `payment_number (unique per company)`, `invoice_id (FK)`, `customer_id (FK)`, `amount`, `payment_date`, `payment_method`, `notes`, `created_by (FK users)`, `created_at`

**payment_allocations** *(لدعم دفعة واحدة موزعة على أكثر من فاتورة مستقبلاً — انظر OD-12)*
`id (PK)`, `payment_id (FK)`, `invoice_id (FK)`, `allocated_amount`

**returns**
`id (PK)`, `company_id (FK)`, `return_number (unique per company)`, `invoice_id (FK)`, `rep_id (FK users)`, `return_date`, `total_amount_gross`, `total_amount_net`, `total_vat_amount`, `created_by (FK users)`, `created_at`

**return_items**
`id (PK)`, `return_id (FK)`, `invoice_item_id (FK)`, `returned_quantity`, `unit_price_at_return`, `line_net`, `line_vat`, `line_gross`

**document_sequences**
`id (PK)`, `company_id (FK)`, `document_type (invoice|return|payment)`, `last_number`, `updated_at`
*(للترقيم الآمن الذري لكل شركة ونوع مستند)*

**audit_logs**
`id (PK)`, `company_id (FK)`, `user_id (FK)`, `action`, `entity_type`, `entity_id`, `old_value (JSON)`, `new_value (JSON)`, `metadata (JSON)`, `created_at`

**company_settings**
*(يمكن دمجه داخل `companies` مباشرة إن لم توجد إعدادات إضافية غير بيانات الشركة نفسها — انظر OD-13)*

### مبادئ عامة على المستوى الشامل
- **Primary Keys:** UUID لكل الجداول (يدعم Multi-tenant وتوليد من الـ Backend بأمان).
- **Foreign Keys:** كل الجداول الفرعية ترتبط بـ `company_id` مباشرة أو عبر الجدول الأب، لضمان عزل البيانات (Tenant Isolation).
- **Unique Constraints:** `(company_id, invoice_number)`, `(company_id, return_number)`, `(company_id, payment_number)`, `(company_id, sku)`, `(company_id, username)`.
- **Indexes:** على `customer_id`, `invoice_id`, `status`, `invoice_date`, `rep_id` (لأداء التقارير والفلاتر).
- **Timestamps:** `created_at` / `updated_at` على جميع الجداول القابلة للتعديل.
- **RLS (Row Level Security):** تُفعَّل على مستوى `company_id` كحد أدنى؛ صلاحيات Rep/Admin تُطبَّق أساساً في Backend وليس فقط عبر RLS — انظر OD-14.
- **Audit strategy:** جدول `audit_logs` مركزي بدلاً من جداول History منفصلة لكل كيان، لتبسيط الاستعلام والتقارير.

---

## 18. Multi-Tenant Design

كل الجداول الرئيسية مرتبطة بـ `company_id` منذ اليوم الأول، رغم أن MVP يخدم شركة واحدة فقط ولا يتضمن نظام اشتراكات SaaS. هذا يسمح مستقبلاً بإضافة شركات دون إعادة بناء الـ Schema، فقط بإضافة طبقة إدارة اشتراكات/فوترة SaaS لاحقاً (خارج النطاق الحالي).

---

## 19. API Design (REST)

| Endpoint | Method | الوصف |
|---|---|---|
| `/auth/login` | POST | تسجيل الدخول |
| `/auth/logout` | POST | تسجيل الخروج |
| `/customers` | GET/POST | قائمة/إضافة عملاء |
| `/customers/:id` | GET/PATCH | تفاصيل/تعديل عميل |
| `/customers/:id/statement` | GET | كشف حساب العميل |
| `/products` | GET/POST | قائمة/إضافة منتجات |
| `/products/:id` | GET/PATCH | تفاصيل/تعديل منتج |
| `/categories` | GET/POST | التصنيفات |
| `/invoices` | GET/POST | قائمة/إنشاء فاتورة (Draft) |
| `/invoices/:id` | GET/PATCH | تفاصيل/تعديل Draft |
| `/invoices/:id/issue` | POST | إصدار الفاتورة |
| `/invoices/:id/cancel` | POST | إلغاء الفاتورة |
| `/invoices/:id/pdf` | GET | جلب/توليد PDF |
| `/payments` | GET/POST | قائمة/تسجيل دفعة |
| `/returns` | GET/POST | قائمة/إنشاء مرتجع |
| `/reports` | GET | تقارير حسب الفلاتر |
| `/users` | GET/POST | إدارة المستخدمين (Admin فقط) |
| `/audit-logs` | GET | سجل العمليات (Admin فقط) |
| `/company-settings` | GET/PATCH | إعدادات الشركة (Admin فقط) |

لكل Endpoint يجب توثيق: Method, Request Schema, Response Schema, Validation Rules, Authentication, Authorization (الأدوار المسموحة), Error Cases — يُفصَّل هذا في مرحلة API Design التفصيلية بعد اعتماد هذه الوثيقة.

---

## 20. الأمان (Security)

- HTTPS إلزامي في كل البيئات.
- Authentication آمن (hashing لكلمات المرور — bcrypt/argon2)، لا تخزين نص صريح.
- Secure Sessions (HttpOnly, Secure cookies أو JWT مع انتهاء صلاحية قصير + refresh).
- Role-Based Access Control مُطبَّق في Backend (وليس فقط UI).
- التحقق من المدخلات (Input Validation) في Backend عبر نفس مخططات `packages/validation`.
- Rate Limiting، خصوصاً على `/auth/login` (حماية من brute force).
- Environment Variables لكل المفاتيح الحساسة، وعدم كشف `Service Role Key` في Frontend إطلاقاً.
- Supabase RLS كطبقة حماية إضافية على مستوى `company_id`.
- Storage آمن (وصول PDF/الشعار عبر روابط موقّعة Signed URLs عند الحاجة).
- Audit Logs شاملة كما في القسم 16.
- عدم الثقة بأي حسابات مالية قادمة من Frontend — تُعاد حسابها دائماً في Backend.

---

## 21. مكان تنفيذ Business Logic

كل ما يلي يُنفَّذ حصرياً في Backend: إنشاء الفاتورة ورقمها، حساب الضريبة، إصدار الفاتورة، تسجيل الدفعة، إنشاء المرتجع، حساب الكميات القابلة للإرجاع، حساب الرصيد، تحديث حالة الفاتورة، وكل فحوصات الصلاحيات.

---

## 22. UX/UI والشاشات

**مبدأ التصميم:** Mobile-first في التصميم، لكن **Responsive بالكامل** — النظام يعمل على الجوال والكمبيوتر معاً، عربي أولاً، RTL، أقل عدد ممكن من الخطوات لإصدار الفاتورة.

### 22.1 الفرق بين تجربة الجوال وتجربة الكمبيوتر

**على الجوال:** تجربة أشبه بتطبيق (App-like) وليست موقع ويب تقليدي مصغّر:
- كل شاشة تُعرض كصفحة كاملة (Full-screen page) بانتقالات سلسة بين الصفحات، وليست Modals متراكمة.
- **Bottom Navigation Bar** ثابت لأهم الأقسام (Dashboard، إنشاء فاتورة، العملاء، المزيد).
- إخفاء عناصر المتصفح قدر الإمكان (شريط علوي مخصص بدل الاعتماد الكامل على شريط المتصفح).
- إمكانية **تثبيت التطبيق على الشاشة الرئيسية (PWA – Add to Home Screen)** ليبدو كأيقونة تطبيق حقيقي — انظر **OD-16**.

**على الكمبيوتر:** نفس الوظائف بالضبط، لكن بتخطيط موسّع أكثر ملاءمة للشاشات الكبيرة:
- **Sidebar Navigation** ثابت بدل Bottom Bar.
- جداول وقوائم أوسع (مثلاً: جدول الفواتير/العملاء يعرض أعمدة أكثر دفعة واحدة).
- مفيد خصوصاً لواجهة **المدير** (Dashboard، التقارير، إدارة المستخدمين، Activity Log) التي تُستخدم غالباً من مكتب وليس من الميدان.
- المندوب أيضاً يقدر يستخدمه من الكمبيوتر بنفس الوظائف، لكن الاستخدام الأساسي المتوقع له يبقى الجوال.

**قاعدة تصميم واحدة، تخطيطين:** نفس الـ Components والمنطق في الكود (Next.js + Tailwind responsive breakpoints)، دون بناء تطبيقين منفصلين — الفرق في التخطيط (Layout) والتنقل (Navigation) فقط حسب حجم الشاشة.

**مسار إصدار الفاتورة المثالي:**
Login → Dashboard → Create Invoice → اختيار عميل → إضافة منتجات → كمية → سعر الوحدة → حالة الدفع → تاريخ الاستحقاق (إن آجلة) → Review → Issue → PDF → Share.

**شاشات المندوب:** Dashboard, Customers, Customer Details, Add Customer, Products, Add Product, Invoices, Create Invoice, Invoice Review, Invoice Details, Invoice PDF, Payments, Returns, Return Details, Reports, Customer Statement, Profile.

**شاشات المدير:** كل شاشات المندوب + Users, Add User, User Details, Activity Log (Audit), Company Settings — مع رؤية شاملة لكل المناديب.

---

## 23. البحث (Search)

- **Customers:** بحث بالاسم، الجوال، الرقم الضريبي، السجل التجاري.
- **Products:** بحث بالاسم، SKU.
- يجب أن يكون سريعاً ومناسباً للاستخدام على الجوال (بحث فوري / debounced).

---

## 24. التعامل مع ضعف الاتصال (Offline)

لا يُبنى Offline Mode كامل في MVP. لكن يجب:
- منع تكرار إصدار الفاتورة عند إعادة الإرسال (Idempotency — مثلاً عبر `idempotency_key` على مستوى الطلب أو تعطيل الزر بعد أول ضغطة + تحقق من حالة الفاتورة في Backend).
- Offline Mode الكامل يُنقل إلى Phase 2 (Roadmap).

---

## 25. خطة الاختبارات (Testing)

يجب تغطية: Authentication, Permissions, Invoice lifecycle, VAT calculation, Payments, Returns, Balance calculation, PDF generation, Invoice numbering (بما فيها Concurrency), Audit Log.

**أمثلة حالات اختبار إلزامية:**
- أسعار شاملة للضريبة: 18، 16، 15، 12 (التحقق من صحة الاستخراج والتقريب).
- Invoice 1000 → Return 200 → Current 800.
- Invoice 1000 → Payment 300 → Return 200 → Outstanding 500.
- أكثر من مرتجع لنفس الفاتورة.
- محاولة إرجاع كمية تتجاوز المتبقي القابل للإرجاع (يجب الرفض).
- الدفع قبل/بعد المرتجع، بكل التركيبات الممكنة.
- إنشاء فواتير متزامنة (concurrent) للتأكد من عدم تكرار الأرقام.

---

## 26. نطاق MVP

Authentication, Users, Roles, Company Settings, Customers, Products, Categories, Invoices, Payments, Returns, Customer Ledger, Customer Statement, PDF (**متوافق مع ZATCA Phase 1 — QR Code + الحقول الإلزامية**، بدون ربط API)، Storage, Reports, Audit Log, Search, Date Filters, Mobile-first UI.

---

## 27. خارج نطاق MVP

Inventory, Purchasing, Expenses, General Ledger, SaaS Subscription Billing, Advanced Price Lists, Discount System, Complex Offline Mode, WhatsApp API, Advanced Accounting, Multi-branch.

---

## 28. Future Roadmap

قوائم أسعار خاصة بالعميل، حد أدنى للسعر، Offline Mode كامل، استيراد/تصدير Excel، تقارير متقدمة، Push Notifications، WhatsApp API، Inventory، أوامر شراء/بيع، تكاملات محاسبية، **تكامل ZATCA Phase 2 الكامل** (Clearance/Reporting عبر API، XML موقّع بصيغة UBL 2.1، Cryptographic Stamp، Hash Chaining، تسجيل CSID عبر منصة فاتورة) — علماً أن **Phase 1 (QR + توليد PDF متوافق) مطلوب من اليوم الأول ومُدرج ضمن MVP** (انظر القسم 14.1)، Multi-branch، نظام اشتراكات SaaS.

---

## 29. Pre-Implementation Review

مراجعة استشارية قبل اعتماد الوثيقة نهائياً — نقاط تحتاج قراراً أو انتباهاً خاصاً قبل البرمجة:

1. **تقريب الضريبة (Rounding):** بدون قاعدة تقريب معتمدة رسمياً، ستظهر فروقات هللات بين مجموع بنود الفاتورة والإجمالي المعروض في PDF — يجب حسمها قبل البرمجة (OD-6).
2. **الكمية القابلة للإرجاع لكل بند:** المنطق يجب أن يُطبَّق على مستوى `invoice_item` وليس فقط إجمالي الفاتورة، وإلا يمكن إرجاع نفس المنتج أكثر من مرة بشكل غير صحيح إذا تكرر نفس المنتج في أكثر من بند.
3. **تزامن إصدار الفواتير (Race Condition):** بدون قفل ذري على `document_sequences`، مندوبان يصدران فاتورة بنفس اللحظة قد يحصلان على نفس الرقم — يجب معالجته على مستوى Database transaction/lock.
4. **تعديل السعر بلا حد أدنى:** غياب أي حد أدنى للسعر في MVP يعني احتمالية بيع بخسارة دون تنبيه — مقبول حسب المتطلبات الحالية، لكن يُسجَّل كمخاطرة عمل (Business Risk) وليس مشكلة تقنية.
5. **الفاتورة الملغاة وأثرها على الدفعات/المرتجعات المرتبطة:** لم يُحدَّد ماذا يحدث إن وُجدت دفعة أو مرتجع مرتبط بفاتورة يُراد إلغاؤها — يجب تحديد قاعدة واضحة (OD-7).
6. **الدفع الزائد (Overpayment):** لا توجد قاعدة صريحة لما يحدث إن دفع العميل أكثر من `Current Invoice Amount` (OD-8).
7. **RLS مقابل منطق Backend:** الاعتماد فقط على RLS قد لا يكفي لتمييز "Rep يرى فواتيره فقط" لأن هذا شرط منطقي (`rep_id = current_user`) وليس مجرد عزل شركة — يجب دمج RLS مع تحقق صريح في Backend (لا يُعتمد على أحدهما فقط).
8. **QR / ZATCA (تم الحسم):** جميع الفواتير يجب أن تكون متوافقة مع ZATCA Phase 1 (QR Code TLV + الحقول الإلزامية)، بدون ربط API في MVP. تم توثيق التفاصيل في القسم 14.1. **المخاطرة المتبقية:** فاتورة Standard تتطلب رقم ضريبي للعميل — يجب حسم ماذا يحدث إن كان العميل غير مسجل ضريبياً (انظر **OD-15** الجديد أدناه).
9. **حذف/تعطيل مستخدم له فواتير سابقة:** يجب ألا يُسمح بحذف مستخدم فعلياً (Hard Delete) لأنه مرتبط بفواتير/مرتجعات تاريخية — التعطيل (`disabled`) فقط، وهذا مُطبَّق بالفعل في التصميم المقترح لكن يجب تأكيده صراحة.
10. **قابلية التوسع (Scalability):** التصميم الحالي مناسب لحجم صغير-متوسط. عند نمو عدد الفواتير، الفهارس المذكورة في القسم 17 ضرورية، وقد نحتاج لاحقاً Materialized View لكشف الحساب بدل الحساب اللحظي الكامل من الحركات.

---

## 30. Open Decisions

| # | القرار | الخيارات الحالية | التوصية | السبب | الأثر |
|---|---|---|---|---|---|
| OD-1 | مقاييس النجاح (Success Metrics) | لم تُحدَّد | تحديدها بعد اجتماع مراجعة | تحتاج مدخلات عمل وليست تقنية بحتة | يؤثر على أولويات التقارير |
| OD-2 | آلية Auth الفعلية | Supabase Auth مخصص عبر username / نظام Auth كامل مستقل | استخدام Supabase Auth مع username كـ "بريد وهمي" داخلي (`username@company.internal`) لتبسيط الإدارة | يقلل الكود المخصص للأمان (كلمات المرور، الجلسات) | يؤثر على تصميم جدول `users` وAPI الدخول |
| OD-3 | أداة إدارة الـ Monorepo | pnpm workspaces فقط / Turborepo فوقها | pnpm workspaces + Turborepo لاحقاً عند الحاجة للـ caching | البساطة أولاً في MVP | تنظيم المستودع فقط، لا يؤثر على المنتج |
| OD-4 | هل المندوب يعدّل عملاء/منتجات أنشأها غيره؟ | يعدّل الكل / يعدّل ما أنشأه فقط | يعدّل الكل (لأن العميل/المنتج كيان مشترك) لكن Admin فقط يحذف/يعطّل | الطلب الأصلي غامض ("حسب الصلاحيات") | يؤثر على منطق Authorization في `/customers`, `/products` |
| OD-5 | هل نسبة الضريبة موحدة (15%) للكل أم قابلة للتغيير لكل منتج؟ | ثابتة عالمياً / لكل منتج | لكل منتج (مرونة أكبر بتكلفة بسيطة) | مذكور صراحة أن Product يحتوي `vat_rate` | حقل إضافي فقط، بدون تعقيد كبير |
| OD-6 | قاعدة التقريب المالي (Rounding) | Round Half Up لكل بند / تقريب على الإجمالي فقط | Round Half Up على مستوى كل بند ثم الجمع | يمنع فروقات تراكمية ويطابق ممارسات الفوترة الشائعة | **حرج** — يؤثر مباشرة على الأرقام في كل فاتورة وPDF |
| OD-7 | ماذا يحدث لفاتورة Issued فيها خطأ ولا يوجد لها مرتجع/دفع بعد؟ | إلغاء فقط / سماح بتعديل محدود قبل أي دفع/مرتجع | السماح بالإلغاء الكامل فقط إن لم يوجد دفع أو مرتجع مرتبط، وإلا يُستخدم Return للتصحيح | يحافظ على سلامة السجل المالي | يؤثر على `/invoices/:id/cancel` وقواعد التحقق |
| OD-8 | الدفع الزائد (Overpayment) | مرفوض بالكامل (لا يتجاوز Outstanding) / يُسجَّل كرصيد دائن للعميل | رفض الدفعة إن تجاوزت Outstanding في MVP (أبسط وأكثر أماناً)، ونقل "رصيد دائن" لـ Roadmap | يقلل التعقيد المحاسبي في MVP | يؤثر على validation في `/payments` |
| OD-9 | هل الـ Ledger جدول فعلي مخزَّن أم View محسوب من الفواتير/المرتجعات/الدفعات؟ | Materialized Ledger table / Computed on-the-fly | Computed on-the-fly في MVP (أبسط وأقل عرضة لعدم الاتساق)، والانتقال لـ Materialized View عند الحاجة للأداء | حجم البيانات في MVP صغير | يؤثر على تصميم `/customers/:id/statement` والتقارير |
| OD-10 | ✅ **محسوم** — هل مطلوب توافق ZATCA في MVP؟ | — | **Phase 1 فقط (PDF + QR)، بدون ربط API. Phase 2 (Clearance/Reporting/CSID) في Roadmap مستقبلاً.** نوع الفاتورة الأساسي: Standard Tax Invoice. لا حاجة لتسجيل CSID حالياً. | قرار صريح من مالك المنتج | يُطبَّق في القسم 14.1 وDatabase (`invoice_type`, `qr_code_payload`, `issued_at` بدقة الثانية) |
| OD-15 | ماذا لو كان العميل (B2B) بدون رقم ضريبي مسجل؟ | رفض إصدار الفاتورة له / السماح وتحويلها تلقائياً لـ Simplified Tax Invoice / السماح بدون قيد (غير موصى به) | تحويلها تلقائياً إلى `invoice_type = simplified` عند غياب الرقم الضريبي للعميل، مع تنبيه للمندوب في واجهة المراجعة (Review) قبل الإصدار | يمنع توقف عمل المندوب الميداني مع عملاء غير مسجلين ضريبياً، مع الحفاظ على التوافق النظامي | يؤثر على validation في `/invoices/:id/issue` وحقل `invoice_type` |
| OD-16 | هل نبني PWA فعلي (قابل للتثبيت، Manifest + Service Worker) أم فقط تصميم "يشبه" تطبيق بدون تثبيت حقيقي؟ | PWA كامل قابل للتثبيت / تصميم App-like بصري فقط بدون Service Worker | البدء بتصميم App-like بصري (Bottom Nav، صفحات كاملة، انتقالات) في MVP، مع إضافة PWA Manifest بسيط (أيقونة + Add to Home Screen) كتكلفة منخفضة، وتأجيل Service Worker/Offline caching الكامل لـ Phase 2 (مرتبط بقرار Offline في القسم 24) | يعطي إحساس التطبيق بسرعة دون تعقيد إضافي كبير الآن | يؤثر على `apps/web` فقط (Frontend)، لا يؤثر على Backend/Database |
| OD-11 | مكتبة توليد PDF على الخادم | Puppeteer (HTML→PDF) / مكتبة PDF مباشرة (pdf-lib, react-pdf) | Puppeteer لتحكم كامل بالتصميم عبر HTML/CSS مألوف للفريق | سهولة التصميم العربي RTL والتحكم البصري | تفصيل تقني، لا يؤثر على البيانات |
| OD-12 | هل تُدعم دفعة واحدة موزعة على أكثر من فاتورة؟ | نعم من اليوم الأول (`payment_allocations`) / لا، دفعة = فاتورة واحدة فقط في MVP | فاتورة واحدة فقط في MVP (تبسيط)، مع إبقاء جدول `payment_allocations` جاهزاً في الـ Schema لتفعيله لاحقاً بدون Migration كبير | الطلب الأصلي لا يذكر توزيع دفعة على عدة فواتير | يبسّط منطق `/payments` في MVP |
| OD-13 | هل `company_settings` جدول منفصل أم مدموج داخل `companies`؟ | جدول منفصل / مدموج | مدموج داخل `companies` في MVP لعدم وجود إعدادات إضافية واضحة الآن | تبسيط | لا يؤثر على المنتج، فقط الـ Schema |
| OD-14 | مدى الاعتماد على Supabase RLS مقابل تحقق Backend | RLS فقط / Backend فقط / كلاهما | كلاهما: RLS كطبقة حماية إضافية على `company_id`، وBackend هو المصدر الوحيد الموثوق لصلاحيات Rep/Admin التفصيلية | دفاع متعدد الطبقات (Defense in depth) | يؤثر على تصميم Middleware في API |

---

*نهاية النسخة الأولى من الوثيقة. بانتظار مراجعتك للأقسام والقرارات المفتوحة (Open Decisions) قبل الانتقال لمرحلة تصميم API التفصيلي ثم البرمجة.*
