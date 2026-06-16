import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';
import {
  fetchActivityLog,
  fetchActivityLogEventTypes,
  fetchActivityLogUsers,
  formatDateTime,
} from '../api';
import { monthStartIsoDate, todayIsoDate } from '../utils/reportDates';

const EVENT_TYPE_LABELS: Record<string, string> = {
  SALE_CREATED: 'بيع',
  PURCHASE_RECEIVED: 'استلام مشتريات',
  STOCK_ADJUSTED: 'تعديل مخزون',
  PAYMENT_MADE: 'دفعة',
  RETURN_PROCESSED: 'مرتجع',
};

export function ActivityLogPage() {
  const [from, setFrom] = useState(monthStartIsoDate());
  const [to, setTo] = useState(todayIsoDate());
  const [userId, setUserId] = useState('');
  const [eventType, setEventType] = useState('');
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState({
    from: monthStartIsoDate(),
    to: todayIsoDate(),
    userId: '',
    eventType: '',
  });

  const usersQuery = useQuery({
    queryKey: ['activity-log-users'],
    queryFn: fetchActivityLogUsers,
  });

  const eventTypesQuery = useQuery({
    queryKey: ['activity-log-event-types'],
    queryFn: fetchActivityLogEventTypes,
  });

  const logQuery = useQuery({
    queryKey: ['activity-log', applied, page],
    queryFn: () =>
      fetchActivityLog({
        from: applied.from,
        to: applied.to,
        userId: applied.userId || undefined,
        eventType: applied.eventType || undefined,
        page,
        limit: 50,
      }),
  });

  useEffect(() => {
    setPage(1);
  }, [applied]);

  function handleApply(event: React.FormEvent) {
    event.preventDefault();
    setApplied({ from, to, userId, eventType });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          سجل النشاط
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          جميع العمليات المسجلة في النظام من EventLog
        </p>
      </div>

      <form
        onSubmit={handleApply}
        className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-5 dark:border-gray-700 dark:bg-gray-900"
      >
        <div>
          <label className="mb-1 block text-xs text-gray-500">من</label>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">إلى</label>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">المستخدم</label>
          <select
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="">الكل</option>
            {(usersQuery.data ?? []).map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.username})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">نوع الحدث</label>
          <select
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="">الكل</option>
            {(eventTypesQuery.data ?? []).map((type) => (
              <option key={type} value={type}>
                {EVENT_TYPE_LABELS[type] ?? type}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Search className="h-4 w-4" />
            تطبيق
          </button>
        </div>
      </form>

      {logQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          جاري التحميل...
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase">التاريخ</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase">المستخدم</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase">نوع الحدث</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase">العملية</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase">الكيان</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {(logQuery.data?.items ?? []).map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-sm">{formatDateTime(entry.occurredAt)}</td>
                    <td className="px-4 py-3 text-sm">
                      {entry.user?.name ?? entry.createdBy.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {EVENT_TYPE_LABELS[entry.eventType] ?? entry.eventType}
                    </td>
                    <td className="px-4 py-3 text-sm">{entry.entity.label ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {entry.entity.id ? entry.entity.id.slice(0, 8) + '…' : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">{entry.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logQuery.data && logQuery.data.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span>
                صفحة {logQuery.data.page} من {logQuery.data.totalPages} ({logQuery.data.total}{' '}
                سجل)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border px-3 py-1 disabled:opacity-50"
                >
                  السابق
                </button>
                <button
                  type="button"
                  disabled={page >= logQuery.data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border px-3 py-1 disabled:opacity-50"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
