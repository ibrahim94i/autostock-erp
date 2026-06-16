import { AlertCircle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

interface ReportShellProps {
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  onRetry: () => void;
  skeleton: ReactNode;
  children: ReactNode;
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="h-4 w-40 rounded bg-slate-200" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3">
            {Array.from({ length: cols }).map((__, j) => (
              <div key={j} className="h-4 flex-1 rounded bg-slate-200" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="mt-3 h-8 w-32 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

export function ReportShell({
  loading,
  error,
  isEmpty,
  onRetry,
  skeleton,
  children,
}: ReportShellProps) {
  if (loading) return <>{skeleton}</>;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
        <p className="mt-3 text-sm font-medium text-red-800">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="no-print mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          <RefreshCw className="h-4 w-4" />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm text-slate-500">لا توجد بيانات للفترة المختارة</p>
      </div>
    );
  }

  return <>{children}</>;
}
