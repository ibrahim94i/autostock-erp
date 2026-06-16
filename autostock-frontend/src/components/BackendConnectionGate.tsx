import { useEffect, useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { checkBackendConnection } from '../api';

export function BackendConnectionGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'ok' | 'down'>('checking');

  async function probe() {
    setStatus('checking');
    const ok = await checkBackendConnection();
    setStatus(ok ? 'ok' : 'down');
  }

  useEffect(() => {
    void probe();
  }, []);

  useEffect(() => {
    if (status !== 'down' || window.location.protocol !== 'file:') return;

    const timer = window.setInterval(() => {
      void probe();
    }, 3000);

    return () => window.clearInterval(timer);
  }, [status]);

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-600">جاري الاتصال بالخادم...</p>
      </div>
    );
  }

  if (status === 'down') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">تعذر الاتصال بالخادم</p>
          <p className="mt-2 text-sm text-slate-600">
            {window.location.protocol === 'file:'
              ? 'جاري تشغيل الخادم… انتظر قليلاً ثم أعد المحاولة (تأكد أن PostgreSQL يعمل)'
              : 'تأكد من تشغيل الخادم على localhost:3000'}
          </p>
          <button
            type="button"
            onClick={() => void probe()}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return children;
}
