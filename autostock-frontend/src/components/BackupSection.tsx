import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Download, Loader2, Upload, XCircle } from 'lucide-react';
import {
  downloadBackupFile,
  dryRunBackup,
  fetchBackupSchedule,
  restoreBackup,
  updateBackupSchedule,
} from '../api';
import type { BackupDryRunResult, BackupPayload } from '../types';

function countBackupRecords(payload: BackupPayload): number {
  return Object.values(payload.recordCounts ?? {}).reduce((sum, n) => sum + (n ?? 0), 0);
}

export function BackupSection() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [backupFile, setBackupFile] = useState<BackupPayload | null>(null);
  const [fileName, setFileName] = useState('');
  const [dryRunResult, setDryRunResult] = useState<BackupDryRunResult | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sectionError, setSectionError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');

  const [scheduleForm, setScheduleForm] = useState({
    enabled: true,
    intervalHours: '24',
    keepLastN: '7',
  });
  const [scheduleSuccess, setScheduleSuccess] = useState('');

  const scheduleQuery = useQuery({
    queryKey: ['backup-schedule'],
    queryFn: fetchBackupSchedule,
  });

  useEffect(() => {
    if (!scheduleQuery.data) return;
    setScheduleForm({
      enabled: scheduleQuery.data.enabled,
      intervalHours: String(scheduleQuery.data.intervalHours),
      keepLastN: String(scheduleQuery.data.keepLastN),
    });
  }, [scheduleQuery.data]);

  useEffect(() => {
    if (!restoreSuccess) return;
    const timer = setTimeout(() => setRestoreSuccess(''), 8000);
    return () => clearTimeout(timer);
  }, [restoreSuccess]);

  useEffect(() => {
    if (!scheduleSuccess) return;
    const timer = setTimeout(() => setScheduleSuccess(''), 5000);
    return () => clearTimeout(timer);
  }, [scheduleSuccess]);

  const downloadMutation = useMutation({
    mutationFn: downloadBackupFile,
    onError: (err: Error) => setSectionError(err.message),
    onSuccess: () => setSectionError(''),
  });

  const dryRunMutation = useMutation({
    mutationFn: (data: BackupPayload) => dryRunBackup(data),
    onSuccess: (result) => {
      setDryRunResult(result);
      setSectionError('');
      setRestoreSuccess('');
      setConfirmPassword('');
    },
    onError: (err: Error) => setSectionError(err.message),
  });

  const restoreMutation = useMutation({
    mutationFn: ({ password, data }: { password: string; data: BackupPayload }) =>
      restoreBackup(password, data),
    onSuccess: (result) => {
      setRestoreSuccess(
        `تمت الاستعادة بنجاح — ${result.recordsRestored.toLocaleString('ar-EG')} سجل في ${result.tablesRestored.length} جدول`,
      );
      setSectionError('');
      setConfirmPassword('');
      setBackupFile(null);
      setFileName('');
      setDryRunResult(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: Error) => setSectionError(err.message),
  });

  const scheduleMutation = useMutation({
    mutationFn: updateBackupSchedule,
    onSuccess: (data) => {
      queryClient.setQueryData(['backup-schedule'], data);
      setScheduleSuccess('تم حفظ إعدادات الجدولة');
      setSectionError('');
    },
    onError: (err: Error) => setSectionError(err.message),
  });

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setSectionError('');
    setDryRunResult(null);
    setRestoreSuccess('');
    setConfirmPassword('');

    if (!file) {
      setBackupFile(null);
      setFileName('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as BackupPayload;
        setBackupFile(parsed);
        setFileName(file.name);
      } catch {
        setSectionError('ملف JSON غير صالح');
        setBackupFile(null);
        setFileName('');
      }
    };
    reader.onerror = () => {
      setSectionError('تعذر قراءة الملف');
      setBackupFile(null);
      setFileName('');
    };
    reader.readAsText(file);
  }

  function handleDryRun() {
    if (!backupFile) {
      setSectionError('يرجى اختيار ملف نسخة احتياطية أولاً');
      return;
    }
    dryRunMutation.mutate(backupFile);
  }

  function handleRestore() {
    if (!backupFile || !dryRunResult?.valid) return;
    if (!confirmPassword.trim()) {
      setSectionError('يرجى إدخال كلمة المرور للتأكيد');
      return;
    }
    restoreMutation.mutate({ password: confirmPassword, data: backupFile });
  }

  function handleScheduleSave() {
    const intervalHours = parseInt(scheduleForm.intervalHours, 10);
    const keepLastN = parseInt(scheduleForm.keepLastN, 10);

    if (Number.isNaN(intervalHours) || intervalHours < 1) {
      setSectionError('عدد الساعات يجب أن يكون 1 على الأقل');
      return;
    }
    if (Number.isNaN(keepLastN) || keepLastN < 1) {
      setSectionError('عدد النسخ المحفوظة يجب أن يكون 1 على الأقل');
      return;
    }

    scheduleMutation.mutate({
      enabled: scheduleForm.enabled,
      intervalHours,
      keepLastN,
    });
  }

  const totalRecords = backupFile ? countBackupRecords(backupFile) : 0;

  return (
    <div className="mt-10 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">النسخ الاحتياطي</h2>
        <p className="mt-1 text-sm text-slate-500">
          تنزيل نسخة كاملة من البيانات أو استعادتها من ملف JSON
        </p>
      </div>

      {sectionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {sectionError}
        </div>
      )}

      {restoreSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {restoreSuccess}
        </div>
      )}

      {/* Manual download */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900">نسخ يدوي</h3>
        <p className="mt-1 text-sm text-slate-500">
          تنزيل جميع البيانات كملف JSON مع checksum للتحقق
        </p>
        <button
          type="button"
          onClick={() => downloadMutation.mutate()}
          disabled={downloadMutation.isPending}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
        >
          {downloadMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          تنزيل نسخة احتياطية
        </button>
      </div>

      {/* Restore */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900">استعادة من ملف</h3>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              ملف النسخة الاحتياطية (JSON)
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileChange}
                className="mt-1 block w-full text-sm text-slate-600 file:me-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
              />
            </label>
            {fileName && (
              <p className="mt-1 text-xs text-slate-500">الملف المختار: {fileName}</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleDryRun}
            disabled={!backupFile || dryRunMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-600 px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-60"
          >
            {dryRunMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            فحص الملف
          </button>

          {dryRunResult && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                dryRunResult.valid
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              <div className="flex items-start gap-2">
                {dryRunResult.valid ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <div className="space-y-2">
                  {dryRunResult.valid ? (
                    <p className="font-semibold">
                      ✅ الملف سليم ({totalRecords.toLocaleString('ar-EG')} سجل)
                    </p>
                  ) : (
                    <p className="font-semibold">❌ الملف يحتوي على أخطاء</p>
                  )}

                  {dryRunResult.errors.length > 0 && (
                    <ul className="list-inside list-disc space-y-1">
                      {dryRunResult.errors.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  )}

                  {dryRunResult.warnings.length > 0 && (
                    <ul className="list-inside list-disc space-y-1 text-amber-800">
                      {dryRunResult.warnings.map((warn) => (
                        <li key={warn}>{warn}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {dryRunResult?.valid && backupFile && (
            <div className="space-y-4 rounded-lg border border-red-300 bg-red-50 p-4">
              <div className="flex items-start gap-2 text-red-800">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm font-semibold">
                  ⚠️ سيتم حذف جميع البيانات الحالية واستبدالها. هذا الإجراء لا يمكن التراجع عنه.
                </p>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                كلمة المرور للتأكيد
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                />
              </label>

              <button
                type="button"
                onClick={handleRestore}
                disabled={restoreMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {restoreMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                تأكيد الاستعادة
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Schedule */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900">جدولة تلقائية</h3>
        <p className="mt-1 text-sm text-slate-500">
          نسخ احتياطي تلقائي على الخادم (مجلد backups/)
        </p>

        {scheduleQuery.isLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري تحميل الإعدادات...
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={scheduleForm.enabled}
                onChange={(e) =>
                  setScheduleForm((f) => ({ ...f, enabled: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              تفعيل النسخ التلقائي
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                كل كم ساعة
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={scheduleForm.intervalHours}
                  onChange={(e) =>
                    setScheduleForm((f) => ({ ...f, intervalHours: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                احتفظ بآخر كم نسخة
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={scheduleForm.keepLastN}
                  onChange={(e) =>
                    setScheduleForm((f) => ({ ...f, keepLastN: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500"
                />
              </label>
            </div>

            {scheduleQuery.data?.lastAutoBackupAt && (
              <p className="text-xs text-slate-500">
                آخر نسخ تلقائي:{' '}
                {new Date(scheduleQuery.data.lastAutoBackupAt).toLocaleString('ar-EG')}
              </p>
            )}

            {scheduleSuccess && (
              <p className="text-sm text-green-700">{scheduleSuccess}</p>
            )}

            <button
              type="button"
              onClick={handleScheduleSave}
              disabled={scheduleMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {scheduleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              حفظ الجدولة
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
