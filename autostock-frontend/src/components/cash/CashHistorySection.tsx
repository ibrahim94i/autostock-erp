import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, History, Loader2 } from 'lucide-react';
import { fetchCashHistory, formatDateTime, formatPrice, parseQuantity, cashTransactionTypeLabel } from '../../api';
import type { CashHistoryEntry } from '../../types';
import { computeCashRegisterSummary, isCashOutflowTransaction } from '../../utils/cashSummary';
import { formatDisplayDate } from '../../utils/reportDates';

function parseAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'string' ? parseFloat(value) || 0 : value;
}

function registerDateLabel(date: string): string {
  const iso = date.slice(0, 10);
  return formatDisplayDate(iso);
}

function statusLabel(status: string): { text: string; className: string } {
  if (status === 'open') {
    return { text: 'مفتوح', className: 'bg-green-100 text-green-800' };
  }
  return { text: 'مغلق', className: 'bg-slate-100 text-slate-700' };
}

function HistoryDetail({ entry }: { entry: CashHistoryEntry }) {
  const summary =
    entry.summary ??
    computeCashRegisterSummary(entry.openingBalance, entry.transactions ?? []);
  const diff = parseAmount(entry.difference);

  return (
    <div className="space-y-4 border-t border-slate-100 bg-slate-50/80 px-4 py-4">
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">الافتتاحي</dt>
          <dd className="font-semibold">{formatPrice(parseAmount(entry.openingBalance))}</dd>
        </div>
        <div>
          <dt className="text-slate-500">إجمالي الداخل</dt>
          <dd className="font-semibold text-emerald-700">
            {formatPrice(parseAmount(summary.totalIn))}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">إجمالي الخارج</dt>
          <dd className="font-semibold text-red-700">
            {formatPrice(parseAmount(summary.totalOut))}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">المتوقع عند الإغلاق</dt>
          <dd className="font-semibold">{formatPrice(parseAmount(summary.expectedBalance))}</dd>
        </div>
        {entry.status === 'closed' && (
          <>
            <div>
              <dt className="text-slate-500">الرصيد الفعلي</dt>
              <dd className="font-semibold">{formatPrice(parseAmount(entry.actualBalance))}</dd>
            </div>
            <div>
              <dt className="text-slate-500">الفرق</dt>
              <dd
                className={[
                  'font-bold',
                  diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-red-700' : 'text-slate-900',
                ].join(' ')}
              >
                {formatPrice(diff)}
              </dd>
            </div>
          </>
        )}
      </dl>

      {entry.notes && (
        <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-600">
          ملاحظات: {entry.notes}
        </p>
      )}

      {(entry.transactions?.length ?? 0) > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-3 py-2 text-right font-semibold">النوع</th>
                <th className="px-3 py-2 text-right font-semibold">الوصف</th>
                <th className="px-3 py-2 text-right font-semibold">المبلغ</th>
                <th className="px-3 py-2 text-right font-semibold">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {entry.transactions!.map((tx) => (
                <tr key={tx.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{cashTransactionTypeLabel(tx.type)}</td>
                  <td className="px-3 py-2 text-slate-600">{tx.description ?? '—'}</td>
                  <td
                    className={[
                      'px-3 py-2 font-semibold',
                      isCashOutflowTransaction(tx.type) ? 'text-red-700' : 'text-emerald-700',
                    ].join(' ')}
                  >
                    {isCashOutflowTransaction(tx.type) ? '−' : '+'}
                    {formatPrice(parseQuantity(tx.amount))}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{formatDateTime(tx.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-400">لا توجد معاملات مسجّلة</p>
      )}
    </div>
  );
}

interface CashHistorySectionProps {
  currentRegisterId?: string | null;
}

export function CashHistorySection({ currentRegisterId }: CashHistorySectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ['cash', 'history'],
    queryFn: () => fetchCashHistory(),
  });

  const entries = (historyQuery.data ?? [])
    .filter((entry) => entry.id !== currentRegisterId)
    .slice(0, 60);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <History className="h-5 w-5 text-slate-500" />
        <h3 className="font-bold text-slate-900">سجل الصناديق</h3>
        {entries.length > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {entries.length}
          </span>
        )}
      </div>

      {historyQuery.isLoading && (
        <div className="flex items-center justify-center gap-2 p-8 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          جاري تحميل السجل...
        </div>
      )}

      {historyQuery.isError && (
        <p className="p-4 text-sm text-red-600">
          {historyQuery.error instanceof Error
            ? historyQuery.error.message
            : 'فشل تحميل سجل الصناديق'}
        </p>
      )}

      {!historyQuery.isLoading && !historyQuery.isError && entries.length === 0 && (
        <p className="p-8 text-center text-sm text-slate-400">لا يوجد سجل صناديق سابقة بعد</p>
      )}

      {entries.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {entries.map((entry) => {
            const badge = statusLabel(entry.status);
            const summary =
              entry.summary ??
              computeCashRegisterSummary(entry.openingBalance, entry.transactions ?? []);
            const isExpanded = expandedId === entry.id;
            const closingAmount =
              entry.status === 'closed'
                ? parseAmount(entry.actualBalance ?? entry.closingBalance)
                : parseAmount(summary.expectedBalance);

            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-right hover:bg-slate-50"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="font-semibold text-slate-900">
                      {registerDateLabel(entry.date)}
                    </span>
                    <span
                      className={[
                        'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                        badge.className,
                      ].join(' ')}
                    >
                      {badge.text}
                    </span>
                    <span className="text-xs text-slate-400">
                      {entry.transactions?.length ?? 0} معاملة
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500">
                      إغلاق:{' '}
                      <span className="font-bold text-slate-900">{formatPrice(closingAmount)}</span>
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </button>
                {isExpanded && <HistoryDetail entry={entry} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
