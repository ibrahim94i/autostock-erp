import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown, FileSpreadsheet, Search } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchSalesReport, formatCount, formatPrice } from '../../api';
import { ReportShell, TableSkeleton } from './ReportShell';
import { exportToExcel } from '../../utils/exportExcel';
import { monthStartIsoDate, todayIsoDate } from '../../utils/reportDates';

interface SalesReportTabProps {
  onPeriodChange?: (period: string) => void;
}

export function SalesReportTab({ onPeriodChange }: SalesReportTabProps) {
  const [from, setFrom] = useState(monthStartIsoDate());
  const [to, setTo] = useState(todayIsoDate());
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');
  const [applied, setApplied] = useState({
    from: monthStartIsoDate(),
    to: todayIsoDate(),
    groupBy: 'day' as 'day' | 'month',
  });

  const query = useQuery({
    queryKey: ['report-sales', applied.from, applied.to, applied.groupBy],
    queryFn: () => fetchSalesReport(applied.from, applied.to, applied.groupBy),
  });

  const rows = query.data ?? [];
  const isEmpty = !query.isLoading && !query.isError && rows.length === 0;

  useEffect(() => {
    onPeriodChange?.(`الفترة: ${applied.from} — ${applied.to}`);
  }, [applied.from, applied.to, onPeriodChange]);

  const totals = rows.reduce(
    (acc, row) => ({
      sales: acc.sales + row.totalSales,
      profit: acc.profit + row.netProfit,
      count: acc.count + row.salesCount,
    }),
    { sales: 0, profit: 0, count: 0 },
  );

  function handleExportExcel() {
    exportToExcel(
      `تقرير-مبيعات-${applied.from}_${applied.to}.xlsx`,
      'المبيعات',
      ['الفترة', 'إجمالي المبيعات', 'صافي الربح', 'عدد الفواتير'],
      rows.map((r) => [r.period, r.totalSales, r.netProfit, r.salesCount]),
      [15, 18, 18, 15],
    );
  }

  function handleApply() {
    const next = { from, to, groupBy };
    const unchanged =
      applied.from === next.from &&
      applied.to === next.to &&
      applied.groupBy === next.groupBy;
    if (unchanged) {
      void query.refetch();
      return;
    }
    setApplied(next);
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end gap-3">
        <label className="block text-sm font-medium text-slate-700">
          من
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-blue-500"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          إلى
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-blue-500"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          التجميع
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'day' | 'month')}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-blue-500"
          >
            <option value="day">يومي</option>
            <option value="month">شهري</option>
          </select>
        </label>
        <button
          type="button"
          onClick={handleApply}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Search className="h-4 w-4" />
          عرض
        </button>
        {rows.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FileDown className="h-4 w-4" />
              طباعة / PDF
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-lg border border-green-600 px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              تصدير Excel
            </button>
          </>
        )}
      </div>

      <ReportShell
        loading={query.isLoading}
        error={query.isError ? (query.error as Error).message : null}
        isEmpty={isEmpty}
        onRetry={() => void query.refetch()}
        skeleton={<TableSkeleton cols={4} rows={6} />}
      >
        <div className="print-area space-y-6">
          <div className="h-72 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatPrice(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey="totalSales" name="المبيعات" stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="netProfit" name="صافي الربح" stroke="#16a34a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="h-72 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="salesCount" name="عدد الفواتير" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-4 py-3 text-start font-semibold">الفترة</th>
                  <th className="px-4 py-3 text-start font-semibold">إجمالي المبيعات</th>
                  <th className="px-4 py-3 text-start font-semibold">صافي الربح</th>
                  <th className="px-4 py-3 text-start font-semibold">عدد الفواتير</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.period} className="border-b border-slate-100">
                    <td className="px-4 py-2">{row.period}</td>
                    <td className="px-4 py-2">{formatPrice(row.totalSales)}</td>
                    <td className="px-4 py-2">{formatPrice(row.netProfit)}</td>
                    <td className="px-4 py-2">{formatCount(row.salesCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="print-summary-grid grid gap-4 sm:grid-cols-3">
            <div className="print-summary-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="print-summary-card__label text-sm text-slate-500">إجمالي المبيعات</p>
              <p className="print-summary-card__value mt-1 text-xl font-bold">{formatPrice(totals.sales)}</p>
            </div>
            <div className="print-summary-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="print-summary-card__label text-sm text-slate-500">صافي الربح</p>
              <p className="print-summary-card__value mt-1 text-xl font-bold">{formatPrice(totals.profit)}</p>
            </div>
            <div className="print-summary-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="print-summary-card__label text-sm text-slate-500">عدد الفواتير</p>
              <p className="print-summary-card__value mt-1 text-xl font-bold">{formatCount(totals.count)}</p>
            </div>
          </div>
        </div>
      </ReportShell>
    </div>
  );
}
