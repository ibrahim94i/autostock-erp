# تقرير شامل — نظام AutoStock ERP (HEMA)

**تاريخ التقرير:** 17 يونيو 2026  
**الغرض:** توثيق كامل للنظام — للإرسال إلى ChatGPT أو أي مطور

---

## 1. ملخص تنفيذي

**AutoStock ERP** نظام إدارة مخزن قطع غيار سيارات باللغة العربية. يعمل كـ:

- **تطبيق ويب** على Vercel
- **API + قاعدة بيانات** على Railway
- **تطبيق سطح مكتب Windows** (Electron) باسم **HEMA**

| البند | القيمة |
|-------|--------|
| المستودع | `ibrahim94i/autostock-erp` |
| المسار المحلي | `c:\Users\hp\Desktop\autostock-erp` |
| الواجهة (إنتاج) | https://autostock-frontend-one.vercel.app |
| الـ API (إنتاج) | https://autostock-backend-production.up.railway.app |
| العملة الافتراضية | دينار عراقي (د.ع) |
| المستخدم الرئيسي | `admin` |

---

## 2. البنية التقنية

### 2.1 هيكل المشروع

```
autostock-erp/
├── autostock-backend/    ← NestJS 11 + Prisma 7 + PostgreSQL
├── autostock-frontend/   ← React 19 + Vite 8 + Tailwind 4 + Electron
└── scripts/              ← أدوات مراقبة وأداء
```

### 2.2 Backend

| التقنية | الإصدار |
|---------|---------|
| NestJS | ^11 |
| Prisma | ^7.8 |
| PostgreSQL | عبر Railway |
| JWT + Passport | access 15 دقيقة / refresh 7 أيام |
| bcryptjs | تشفير كلمات المرور |
| class-validator | التحقق من الطلبات |

**نقطة الدخول:** `dist/src/main.js`  
**التحقق العام:** `ValidationPipe` مع `whitelist: true` — الحقول غير المعروفة تُزال (لا تُرفض).

### 2.3 Frontend

| التقنية | الإصدار |
|---------|---------|
| React | ^19 |
| Vite | ^8 |
| TypeScript | ~6 |
| React Router | ^7 |
| TanStack Query | ^5 |
| Tailwind CSS | ^4 |
| Recharts | رسوم بيانية |
| xlsx | تصدير Excel |
| Electron | ^34 |

### 2.4 قاعدة البيانات

- PostgreSQL على Railway (خدمة `Postgres`)
- **حجم الاستخدام:** ~220 MB من 5 GB (خطة Hobby)
- **25 نموذج** في Prisma
- **الترحيل:** `prisma migrate deploy` عند بدء الإنتاج

### 2.5 معمارية الأحداث (Event-Driven)

العمليات المحاسبية والمخزنية تمر عبر **EventCoreService**:

| نوع الحدث | التأثير |
|-----------|---------|
| `SALE_CREATED` | خصم مخزون + قيود محاسبية + إدخال نقدي للصندوق |
| `PURCHASE_RECEIVED` | إضافة مخزون + ذمم موردين + تحديث متوسط التكلفة |
| `RETURN_PROCESSED` | إرجاع مخزون + عكس قيود |
| `PAYMENT_MADE` | دفعات عملاء/موردين |
| `STOCK_ADJUSTED` | تسوية جرد |

كل حدث يُسجَّل في `EventLog` مع `clientUuid` لمنع التكرار (Idempotency).

**Handlers:**

- `StockHandler` — حركات المخزون
- `AccountingHandler` — القيود اليومية
- `CashHandler` — معاملات الصندوق

---

## 3. قواعد العلامة التجارية (مهمة جداً)

| السياق | الشعار |
|--------|--------|
| واجهة التطبيق (sidebar، login، watermark) | **HEMA** (`hema-logo.png`) |
| مستندات الزبون (فواتير، بوصلات، تقارير، طباعة) | **حرير البصرة** (`company-logo.png`) — لا يُستبدل بـ HEMA |

**ملفات رئيسية:**

- `autostock-frontend/src/utils/companyLogoDataUrl.ts`
- `autostock-frontend/src/utils/printBranding.ts`
- `autostock-frontend/src/pos/invoicePrint.ts`

---

## 4. الأقسام (Frontend Routes)

| المسار | القسم | الوصف |
|--------|-------|-------|
| `/login` | تسجيل الدخول | JWT |
| `/dashboard` | لوحة التحكم | ملخص يومي |
| `/pos` | نقطة البيع | بيع نقد/آجل، قطعة/كارتون |
| `/cash-register` | الصندوق | فتح/إغلاق، إيداع، سجل |
| `/products` | المنتجات | CRUD، استيراد Excel |
| `/inventory` | المخزون | أرصدة، تسوية، تنبيه نقص |
| `/purchasing` | المشتريات | أوامر شراء، استلام |
| `/suppliers` | الموردين | CRUD، أرصدة، دفعات |
| `/customers` | العملاء | CRUD، كشف حساب |
| `/sales-returns` | مرتجعات | إرجاع بقطعة أو كارتون |
| `/receipts` | البوصلات | تسجيل طباعة الفواتير |
| `/expenses` | المصروفات | تصنيفات ومصروفات |
| `/reports` | التقارير | يومي، مبيعات، منتجات، عملاء، مخزون |
| `/settings` | الإعدادات | admin فقط |
| `/activity-log` | سجل النشاط | admin فقط |

---

## 5. تفصيل الوحدات (Backend)

### المبيعات (`/sales`)

- `POST /sales` — إنشاء بيع (cashier, admin)
- نوع: retail / wholesale | دفع: cash / debt
- وحدات: `qty` (قطع) + `qtyUnit` + `displayQty`
- `POST /sales/:id/returns` — مرتجعات
- `GET /sales/:id/invoice` — فاتورة

### المخزون (`/stock`)

- `GET /stock/balances` — أرصدة
- `POST /stock/reconcile` — تسوية
- `GET /stock/low-alerts` — تنبيه نقص
- التخزين الداخلي دائماً **بالقطع**

### المشتريات (`/purchase-orders`)

- مسودة → استلام → `PURCHASE_RECEIVED`
- `unitCost` = سعر الكارتون | `qty` = قطع
- عند الاستلام يُحوَّل لسعر القطعة للمخزون

### الصندوق (`/cash`)

- `POST /cash/open` / `POST /cash/close`
- `POST /cash/deposit` — إيداع نقد + بوصل
- `GET /cash/today` — اليوم + `suggestedOpeningBalance`
- `GET /cash/history` — سجل كل الأيام

**معاملات:**

- داخل: `sale`, `payment_in`, `cash_deposit`
- خارج: `payment_out`, `expense`

### المحاسبة

- دفعات عملاء/موردين
- دليل حسابات (Cash, AR, AP, Sales, COGS, Inventory)
- `GET /reports/profit`

### التقارير

- `/dashboard/summary`, `/reports/daily`, `/reports/sales`, `/reports/products`, `/reports/customers`, `/reports/inventory-movement`

### أخرى

- إعدادات، نسخ احتياطي JSON، Telegram، مزامنة offline (`/sync`), سجل نشاط (`/activity-log`)

---

## 6. نظام الصلاحيات

| الدور | الوصول التقريبي |
|-------|-----------------|
| `admin` | كل شيء |
| `cashier` | مبيعات، عملاء، صندوق، بوصلات |
| `warehouse` | منتجات، مخزون، مشتريات |
| `accountant` | صندوق، مصروفات، تقارير، دفعات |

**ملاحظة:** صلاحيات JSON في DB غير مُطبَّقة ديناميكياً — الـ backend يستخدم `@Roles()` ثابتة.

**مستخدمون تجريبيون (seed):** admin/admin123, cashier/cashier123, warehouse/warehouse123, accountant/accountant123

---

## 7. نظام الوحدات المزدوجة (قطعة + كارتون)

| المفهوم | التفاصيل |
|---------|----------|
| التخزين | دائماً قطع في `qty` |
| العرض | "100 كارتون + 3 قطع" |
| `unitsPerCarton` | على كل منتج |
| الجملة | سعر الكارتون |
| المفرد | سعر القطعة |

**ملفات:** `units.ts`, `qty-units.util.ts`

---

## 8. النشر

### Railway (Backend)

```powershell
cd autostock-backend
railway up --detach
```

- git push **لا ينشر تلقائياً**

### Vercel (Frontend)

```powershell
cd autostock-frontend
npx vercel --prod --yes
```

- متغير: `VITE_API_URL` → رابط Railway

### Electron

```powershell
npm run electron:build
```

---

## 9. آخر التحديثات

### في Git (آخر commits)

| Commit | الوصف |
|--------|-------|
| `0fd831b` | وحدات قطعة/كارتون في المبيعات والمخزون والتقارير |
| `97cbdc2` | إيداع نقد يدوي + بوصل طباعة |
| `ef30666` | إجماليات الصندوق من كل المعاملات |
| `ad2184d` | المصروفات كخارج من الصندوق |
| `2a16b37`–`4821d93` | HEMA + حرير البصرة للطباعة |
| `43ba753` | مرتجعات بالكارتون |
| `1016ed5` | تحسين أداء أرصدة العملاء/الموردين |

### منشور لكن غير committed

1. إصلاح أوامر الشراء (سعر كارتون vs قطع)
2. سجل الصناديق في الواجهة
3. رصيد افتتاحي تلقائي من آخر إغلاق
4. `forbidNonWhitelisted: false` في ValidationPipe
5. عرض تفاصيل PO بالوحدات المزدوجة

---

## 10. الأخطاء

### مُصلَح

| الخطأ | الحل |
|-------|------|
| `qtyUnit should not exist` | إعادة نشر backend + ValidationPipe |
| مصروفات + بالصندوق | إضافة expense لـ OUTFLOW_TYPES |
| إجمالي PO ×4 | تحويل سعر الكارتون عند الحفظ |
| بيانات الصندوق تختفي | سجل الصناديق + history API |
| watermark HEMA | نقل داخل #root |

### مفتوح

| الخطأ | التفاصيل |
|-------|----------|
| `GET /expenses?page&limit` → 400 | DTO لا يقبل pagination |
| `GET /receipts?page&limit` → 400 | نفس المشكلة |
| أوامر شراء قديمة | إجماليات عرض خاطئة قبل الإصلاح |
| Postgres-415e | خدمة DB زائدة على Railway |
| git push لا ينشر | نشر يدوي Vercel + Railway |
| تغييرات غير committed | يُنصح بـ commit |

---

## 11. الأداء (17 يونيو 2026 — إنتاج)

| الشاشة | وقت API | التصنيف |
|--------|---------|---------|
| Login | 238 ms | جيد |
| Dashboard | 503 ms | يحتاج تحسين |
| Products | 529 ms | يحتاج تحسين |
| Inventory | 1136 ms | يحتاج تحسين |
| Purchasing | 1130 ms | يحتاج تحسين |
| Customers | 375 ms | جيد |
| Reports Daily | 863 ms | يحتاج تحسين |
| POS | 906 ms | يحتاج تحسين |

**أبطأ طلبات:** `/cash/today` (1096 ms), `/auth/login` (939 ms)

**مصدر:** `scripts/performance-audit-results.json`

---

## 12. التخزين (Railway)

| البند | القيمة |
|-------|--------|
| الاستخدام | ~220 MB |
| الحد (Hobby) | 5 GB |
| كفاية زبون متوسط | سنوات عديدة |

---

## 13. الاختبارات

- Jest: scaffold فقط
- سكربتات يدوية: `autostock-backend/scripts/test-*.ts`

---

## 14. متغيرات البيئة

**Backend:**

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
CORS_ORIGIN=https://autostock-frontend-one.vercel.app
NODE_ENV=production
PORT=3000
```

**Frontend:**

```
VITE_API_URL=https://autostock-backend-production.up.railway.app
```

---

## 15. تدفق العمل اليومي

```
1. فتح الصندوق (رصيد من إغلاق أمس)
2. مبيعات POS
3. استلام مشتريات
4. مصروفات / دفعات
5. إغلاق الصندوق
6. تقرير يومي / Telegram
```

---

## 16. نقاط ضعف للمراجعة

1. pagination غير موحّد
2. صلاحيات غير ديناميكية
3. لا CI/CD
4. تغطية اختبارات ضعيفة
5. Postgres مكرر على Railway
6. DTOs لا تتوافق مع بعض query params
7. تغييرات غير committed

---

## 17. ملخص لـ ChatGPT

> **AutoStock ERP** = NestJS + React ERP عربي لقطع غيار. Event-sourced. تخزين بالقطع، عرض قطعة+كارتون. نشر Vercel+Railway. HEMA للتطبيق، حرير البصرة للمستندات. آخر عمل: وحدات مزدوجة، صندوق، إصلاح PO. أخطاء مفتوحة: pagination expenses/receipts. أداء 240–1100 ms/API.

---

*نهاية التقرير*
