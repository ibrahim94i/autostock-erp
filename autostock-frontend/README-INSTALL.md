# AutoStock ERP — دليل التثبيت

دليل تثبيت وتشغيل AutoStock ERP على Windows مع PostgreSQL.

---

## 1. تثبيت PostgreSQL

1. حمّل PostgreSQL 15+ من [postgresql.org/download/windows](https://www.postgresql.org/download/windows/).
2. ثبّت PostgreSQL مع pgAdmin (اختياري).
3. أثناء التثبيت، احفظ:
   - **اسم المستخدم** (مثال: `postgres` أو `apex`)
   - **كلمة المرور**
   - **المنفذ** (الافتراضي: `5432`)

---

## 2. إنشاء قاعدة البيانات

افتح **pgAdmin** أو **psql** ونفّذ:

```sql
CREATE USER apex WITH PASSWORD 'apex';
CREATE DATABASE autostock OWNER apex;
GRANT ALL PRIVILEGES ON DATABASE autostock TO apex;
```

> غيّر اسم المستخدم وكلمة المرور حسب بيئتك.

---

## 3. إعداد `.env`

### Backend (`autostock-backend/.env`)

انسخ من `.env.example`:

```bash
copy .env.example .env
```

عدّل القيم:

```env
DATABASE_URL="postgresql://apex:apex@localhost:5432/autostock?schema=public"
JWT_SECRET=your_secret_key_change_me
```

### Bundled backend (Electron)

عند بناء التطبيق، يُنسخ Backend إلى `autostock-frontend/resources/backend/`.
تأكد من وجود `.env` هناك أيضاً بنفس `DATABASE_URL`.

---

## 4. تشغيل النظام

### أ) وضع التطوير

**Terminal 1 — Backend:**

```bash
cd autostock-backend
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

**Terminal 2 — Frontend (متصفح):**

```bash
cd autostock-frontend
npm install
npm run dev
```

افتح: `http://localhost:5173`  
**تسجيل الدخول الافتراضي:** `admin` / `admin123`

**Terminal 2 — Electron (سطح المكتب):**

```bash
cd autostock-frontend
npm run electron:dev
```

### ب) بناء ملفات التثبيت (Setup.exe / Portable)

```bash
cd autostock-frontend
npm run electron:build
```

الملفات الناتجة في `dist-electron/`:

| الملف | الوصف |
|-------|--------|
| `AutoStock ERP Setup x.x.x.exe` | مثبّت NSIS |
| `AutoStock ERP x.x.x.exe` | نسخة portable |

> **متطلب:** PostgreSQL يعمل على الجهاز قبل تشغيل التطبيق.

### ج) التشغيل السريع (إن وُجد build)

```bat
AutoStock.bat
```

---

## 5. النسخ الاحتياطي

### من داخل التطبيق

1. سجّل دخول كـ **admin**.
2. اذهب إلى **الإعدادات**.
3. اضغط **إنشاء نسخة احتياطية**.
4. احفظ ملف JSON على قرص آمن.

### من سطر الأوامر (PostgreSQL)

```bash
pg_dump -U apex -d autostock -F c -f autostock_backup.dump
```

---

## 6. استعادة النسخة الاحتياطية

### من داخل التطبيق

1. **الإعدادات** → **استعادة نسخة احتياطية**.
2. ارفع ملف JSON السابق.
3. أدخل كلمة مرور المسؤول للتأكيد.

> **تحذير:** الاستعادة تستبدل جميع البيانات الحالية.

### من pg_dump

```bash
pg_restore -U apex -d autostock --clean --if-exists autostock_backup.dump
```

---

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| `ECONNREFUSED` على المنفذ 3000 | تأكد أن Backend يعمل (`npm run start:dev`) |
| فشل الاتصال بقاعدة البيانات | تحقق من `DATABASE_URL` وPostgreSQL |
| Electron لا يفتح | تأكد من `dist-electron/win-unpacked/` أو أعد `npm run electron:build` |
| جداول غير موجودة | `npx prisma migrate deploy` |

---

## المتطلبات

- Windows 10/11
- Node.js 20+
- PostgreSQL 15+
- 4 GB RAM (موصى به)
