import { useEffect, useState, type ReactNode } from 'react';
import { apiUrl } from '../api';
import { IS_DEMO_MODE } from '../utils/companyInfo';

interface TrialInfo {
  enabled: boolean;
  expired: boolean;
  expiresAt: string | null;
  remainingMs: number | null;
}

function formatRemaining(ms: number | null): string {
  if (ms == null) return '';
  const hours = Math.max(0, Math.ceil(ms / (1000 * 60 * 60)));
  if (hours >= 24) {
    const days = Math.ceil(hours / 24);
    return `${days} يوم تقريباً`;
  }
  return `${hours} ساعة تقريباً`;
}

export function TrialGate({ children }: { children: ReactNode }) {
  const [trial, setTrial] = useState<TrialInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(apiUrl('/health'));
        const data = (await res.json()) as { trial?: TrialInfo };
        if (!cancelled && data.trial) setTrial(data.trial);
      } catch {
        /* ignore — backend gate handles hard block */
      }
    }
    void load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (trial?.enabled && trial.expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-center text-white">
        <div className="max-w-md space-y-4">
          <p className="text-sm uppercase tracking-wide text-amber-300">HEMA ERP</p>
          <h1 className="text-2xl font-bold">انتهت الفترة التجريبية</h1>
          <p className="text-slate-300">
            النسخة التجريبية انتهت. تواصل معنا لتفعيل النسخة الكاملة.
          </p>
          {trial.expiresAt && (
            <p className="text-xs text-slate-500">
              انتهى في: {new Date(trial.expiresAt).toLocaleString('ar-IQ')}
            </p>
          )}
          <p className="pt-2 text-sm text-slate-400">07719936448</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {IS_DEMO_MODE && trial?.enabled && !trial.expired && (
        <div className="bg-amber-500 px-3 py-1.5 text-center text-sm font-semibold text-amber-950">
          نسخة تجريبية HEMA
          {trial.expiresAt
            ? ` — متبقي ${formatRemaining(trial.remainingMs)} (حتى ${new Date(trial.expiresAt).toLocaleString('ar-IQ')})`
            : ''}
        </div>
      )}
      {children}
    </>
  );
}
