import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown, FileSpreadsheet, Receipt, Search } from 'lucide-react';
import {
  fetchExpenseCategories,
  fetchExpenses,
  formatDateTime,
  formatPrice,
  parseQuantity,
} from '../../api';
import { ReportShell, TableSkeleton } from './ReportShell';
import { exportToExcel } from '../../utils/exportExcel';
import { monthStartIsoDate, todayIsoDate } from '../../utils/reportDates';

function formatExpenseDate(date: string): string {
  return formatDateTime(date).split(' ')[0] ?? date.slice(0, 10);
}

interface ExpensesReportTabProps {
  onPeriodChange?: (period: string) => void;
}

export function ExpensesReportTab({ onPeriodChange }: ExpensesReportTabProps) {
  const [from, setFrom] = useState(monthStartIsoDate());
  const [to, setTo] = useState(todayIsoDate());
  const [categoryFilter, setCategoryFilter] = useState('');
  const [applied, setApplied] = useState({
    from: monthStartIsoDate(),
    to: todayIsoDate(),
    categoryId: '',
  });

  const categoriesQuery = useQuery({
    queryKey: ['expense-categories'],
    queryFn: fetchExpenseCategories,
  });

  const query = useQuery({
    queryKey: ['report-expenses', applied],
    queryFn: () =>
      fetchExpenses({
        from: applied.from || undefined,
        to: applied.to || undefined,
        categoryId: applied.categoryId || undefined,
      }),
  });

  const categories = categoriesQuery.data ?? [];
  const items = query.data?.items ?? [];
  const total = parseQuantity(query.data?.total ?? 0);
  const isEmpty = !query.isLoading && !query.isError && items.length === 0;

  useEffect(() => {
    onPeriodChange?.(`الفترة: ${applied.from} — ${applied.to}`);
  }, [applied.from, applied.to, onPeriodChange]);

  function handleApply() {
    setApplied({ from, to, categoryId: categoryFilter });
  }

  function handleExportExcel() {
    exportToExcel(
      `تقرير-مصاريف-${applied.from}_${applied.to}.xlsx`,
      'المصاريف',
      ['التاريخ', 'الفئة', 'الوصف', 'المبلغ'],
      items.map((item) => [
        formatExpenseDate(item.date),
        item.category.name,
        item.description ?? '',
        parseQuantity(item.amount),
      ]),
      [14, 16, 28, 14],
    );
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <label className="text-sm font-medium text-slate-700">
          من
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          إلى
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          الفئة
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mt-1 block min-w-[160px] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">الكل</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleApply}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900"
        >
          <Search className="h-4 w-4" />
          تطبيق
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={items.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <FileDown className="h-4 w-4" />
          طباعة / PDF
        </button>
        <button
          type="button"
          onClick={handleExportExcel}
          disabled={items.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <FileSpreadsheet className="h-4 w-4" />
          تصدير Excel
        </button>
      </div>

      <div className="print-area rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-center gap-2 text-amber-900">
          <Receipt className="h-5 w-5" />
          <span className="text-sm font-medium">إجمالي المصاريف للفترة:</span>
          <span className="print-summary-card__value text-lg font-bold">{formatPrice(total)}</span>
        </div>
      </div>

      <ReportShell
        loading={query.isLoading}
        error={query.error instanceof Error ? query.error.message : null}
        isEmpty={isEmpty}
        onRetry={() => void query.refetch()}
        skeleton={<TableSkeleton rows={6} cols={4} />}
      >
        <div className="print-area overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
                <th className="px-4 py-3 text-right font-semibold">الفئة</th>
                <th className="px-4 py-3 text-right font-semibold">الوصف</th>
                <th className="px-4 py-3 text-right font-semibold">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{formatExpenseDate(item.date)}</td>
                  <td className="px-4 py-3 font-medium">{item.category.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.description ?? '—'}</td>
                  <td className="px-4 py-3 font-bold text-red-700">
                    {formatPrice(parseQuantity(item.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportShell>
    </div>
  );
}
