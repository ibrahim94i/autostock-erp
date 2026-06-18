import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send, Trash2 } from 'lucide-react';
import { resetAllData, sendTelegramTest, updateSettings } from '../api';
import { useSettings } from '../context/SettingsContext';
import { BackupSection } from '../components/BackupSection';
import type { UpdateSettingsPayload } from '../types';

const RECEIPT_SIZE_OPTIONS = [
  { value: '58mm', label: '58mm (حراري)' },
  { value: '80mm', label: '80mm (حراري)' },
  { value: 'A4', label: 'A4' },
] as const;

export function SettingsPage() {
  const { settings, setSettingsLocal, refreshSettings } = useSettings();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    companyName: settings.companyName,
    companyPhone: settings.companyPhone ?? '',
    companyAddress: settings.companyAddress ?? '',
    companyLogo: settings.companyLogo ?? '',
    taxNumber: settings.taxNumber ?? '',
    currency: settings.currency,
    receiptSize: settings.receiptSize,
    defaultTaxRate: String(settings.defaultTaxRate),
    defaultReceiptFooter: settings.defaultReceiptFooter,
    telegramBotToken: settings.telegramBotToken ?? '',
    telegramChatId: settings.telegramChatId ?? '',
    telegramDailyTime: settings.telegramDailyTime ?? '21:00',
    telegramEnabled: settings.telegramEnabled ?? false,
    enableDailyVoice: settings.enableDailyVoice ?? false,
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [telegramMessage, setTelegramMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [telegramError, setTelegramError] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
    document.title = 'الإعدادات — AutoStock ERP';
  }, []);

  useEffect(() => {
    setForm({
      companyName: settings.companyName,
      companyPhone: settings.companyPhone ?? '',
      companyAddress: settings.companyAddress ?? '',
      companyLogo: settings.companyLogo ?? '',
      taxNumber: settings.taxNumber ?? '',
      currency: settings.currency,
      receiptSize: settings.receiptSize,
      defaultTaxRate: String(settings.defaultTaxRate),
      defaultReceiptFooter: settings.defaultReceiptFooter,
      telegramBotToken: settings.telegramBotToken ?? '',
      telegramChatId: settings.telegramChatId ?? '',
      telegramDailyTime: settings.telegramDailyTime ?? '21:00',
      telegramEnabled: settings.telegramEnabled ?? false,
      enableDailyVoice: settings.enableDailyVoice ?? false,
    });
  }, [settings.updatedAt]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(''), 5000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!telegramMessage) return;
    const timer = setTimeout(() => setTelegramMessage(''), 5000);
    return () => clearTimeout(timer);
  }, [telegramMessage]);

  const saveMutation = useMutation({
    mutationFn: (payload: UpdateSettingsPayload) => updateSettings(payload),
    onSuccess: (data) => {
      setSettingsLocal(data);
      void refreshSettings();
      setFormError('');
      setSuccessMessage('تم حفظ الإعدادات بنجاح');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetAllData(),
    onSuccess: async (data) => {
      setResetConfirm('');
      setResetError('');
      setResetMessage(data.message);
      await queryClient.clear();
      void refreshSettings();
      window.setTimeout(() => window.location.reload(), 800);
    },
    onError: (err: Error) => setResetError(err.message),
  });

  function handleResetData(e: FormEvent) {
    e.preventDefault();
    if (resetConfirm !== 'RESET') {
      setResetError('اكتب RESET للتأكيد');
      return;
    }
    if (!window.confirm('هل أنت متأكد؟ سيتم حذف جميع البيانات التشغيلية نهائياً.')) {
      return;
    }
    setResetError('');
    resetMutation.mutate();
  }

  const testTelegramMutation = useMutation({
    mutationFn: () => sendTelegramTest(),
    onSuccess: (result) => {
      setTelegramError('');
      const voiceNote =
        result.voice?.ok === true
          ? ' (نص + صوت)'
          : result.voice?.ok === false
            ? ' (نص فقط — فشل الصوت)'
            : '';
      setTelegramMessage(`تم إرسال رسالة الاختبار إلى Telegram${voiceNote}`);
    },
    onError: (err: Error) => setTelegramError(err.message),
  });

  function buildPayload(): UpdateSettingsPayload | null {
    const taxRate = parseFloat(form.defaultTaxRate);
    if (Number.isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
      setFormError('نسبة الضريبة يجب أن تكون بين 0 و 100');
      return null;
    }

    return {
      companyName: form.companyName.trim(),
      companyPhone: form.companyPhone.trim() || undefined,
      companyAddress: form.companyAddress.trim() || undefined,
      companyLogo: form.companyLogo.trim() || undefined,
      taxNumber: form.taxNumber.trim() || undefined,
      currency: form.currency.trim() || 'د.ع',
      receiptSize: form.receiptSize,
      defaultTaxRate: taxRate,
      defaultReceiptFooter: form.defaultReceiptFooter.trim(),
      telegramBotToken: form.telegramBotToken.trim() || undefined,
      telegramChatId: form.telegramChatId.trim() || undefined,
      telegramDailyTime: form.telegramDailyTime,
      telegramEnabled: form.telegramEnabled,
      enableDailyVoice: form.enableDailyVoice,
    };
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');

    const payload = buildPayload();
    if (!payload) return;

    saveMutation.mutate(payload);
  }

  function handleTelegramSave(e: FormEvent) {
    e.preventDefault();
    setTelegramError('');
    setFormError('');

    const payload = buildPayload();
    if (!payload) return;

    saveMutation.mutate(payload, {
      onSuccess: (data) => {
        setSettingsLocal(data);
        void refreshSettings();
        setTelegramMessage('تم حفظ إعدادات Telegram');
      },
      onError: (err: Error) => setTelegramError(err.message),
    });
  }

  function handleTelegramTest() {
    setTelegramError('');
    testTelegramMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">إعدادات الشركة</h2>
        <p className="mt-1 text-sm text-slate-500">بيانات الشركة وإعدادات الفواتير</p>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <label className="block text-sm font-medium text-slate-700">
          اسم الشركة (مطلوب)
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            رقم الهاتف
            <input
              type="tel"
              value={form.companyPhone}
              onChange={(e) => setForm((f) => ({ ...f, companyPhone: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            الرقم الضريبي
            <input
              type="text"
              value={form.taxNumber}
              onChange={(e) => setForm((f) => ({ ...f, taxNumber: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500"
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          العنوان
          <input
            type="text"
            value={form.companyAddress}
            onChange={(e) => setForm((f) => ({ ...f, companyAddress: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          الشعار (رابط URL مؤقتاً)
          <input
            type="url"
            value={form.companyLogo}
            onChange={(e) => setForm((f) => ({ ...f, companyLogo: e.target.value }))}
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            العملة
            <input
              type="text"
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            حجم الفاتورة الافتراضي
            <select
              value={form.receiptSize}
              onChange={(e) => setForm((f) => ({ ...f, receiptSize: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500"
            >
              {RECEIPT_SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          نسبة الضريبة الافتراضية (%)
          <input
            type="number"
            min={0}
            max={100}
            step="any"
            value={form.defaultTaxRate}
            onChange={(e) => setForm((f) => ({ ...f, defaultTaxRate: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          نص تذييل الفاتورة
          <textarea
            value={form.defaultReceiptFooter}
            onChange={(e) => setForm((f) => ({ ...f, defaultReceiptFooter: e.target.value }))}
            rows={3}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500"
          />
        </label>

        {formError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
        )}

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            'حفظ'
          )}
        </button>
      </form>

      <div className="mt-8">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">إشعارات Telegram</h2>
          <p className="mt-1 text-sm text-slate-500">
            إرسال ملخص يومي تلقائياً إلى قناة أو مجموعة Telegram
          </p>
        </div>

        {telegramMessage && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {telegramMessage}
          </div>
        )}

        <form
          onSubmit={handleTelegramSave}
          className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">تفعيل الإرسال اليومي</p>
              <p className="text-xs text-slate-500">يرسل تقرير اليوم في الوقت المحدد</p>
            </div>
            <input
              type="checkbox"
              checked={form.telegramEnabled}
              onChange={(e) =>
                setForm((f) => ({ ...f, telegramEnabled: e.target.checked }))
              }
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">إرسال ملخص صوتي يومي</p>
              <p className="text-xs text-slate-500">
                يرسل رسالة صوتية بعد التقرير النصي (اختبار الإرسال يشمل الصوت عند التفعيل)
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.enableDailyVoice}
              onChange={(e) =>
                setForm((f) => ({ ...f, enableDailyVoice: e.target.checked }))
              }
              className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Bot Token
            <input
              type="password"
              value={form.telegramBotToken}
              onChange={(e) => setForm((f) => ({ ...f, telegramBotToken: e.target.value }))}
              placeholder="123456789:ABC..."
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Chat ID
            <input
              type="text"
              value={form.telegramChatId}
              onChange={(e) => setForm((f) => ({ ...f, telegramChatId: e.target.value }))}
              placeholder="-1001234567890"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            وقت الإرسال اليومي
            <input
              type="time"
              value={form.telegramDailyTime}
              onChange={(e) => setForm((f) => ({ ...f, telegramDailyTime: e.target.value }))}
              className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </label>

          {telegramError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{telegramError}</p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleTelegramTest}
              disabled={testTelegramMutation.isPending || saveMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {testTelegramMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              اختبار الإرسال
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                'حفظ'
              )}
            </button>
          </div>

          <p className="text-xs text-slate-500">
            احفظ Bot Token و Chat ID قبل «اختبار الإرسال». الوقت الافتراضي 21:00.
          </p>
        </form>
      </div>

      <BackupSection />

      <section className="mt-8 space-y-4 rounded-xl border border-red-200 bg-red-50 p-6">
        <div>
          <h3 className="text-lg font-bold text-red-900">حذف جميع البيانات</h3>
          <p className="mt-1 text-sm text-red-800">
            يحذف المنتجات والعملاء والموردين والمبيعات والمخزون والصندوق. يبقى المستخدمون
            والإعدادات ودليل الحسابات.
          </p>
        </div>

        {resetMessage && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {resetMessage}
          </p>
        )}

        <form onSubmit={handleResetData} className="space-y-3">
          <label className="block text-sm font-medium text-red-900">
            للتأكيد اكتب RESET
            <input
              type="text"
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="RESET"
              className="mt-1 w-full max-w-xs rounded-lg border border-red-300 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-red-500"
            />
          </label>

          {resetError && (
            <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800">{resetError}</p>
          )}

          <button
            type="submit"
            disabled={resetMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {resetMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            حذف جميع البيانات
          </button>
        </form>
      </section>
    </div>
  );
}
