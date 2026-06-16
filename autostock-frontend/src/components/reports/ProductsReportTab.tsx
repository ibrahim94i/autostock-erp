import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown, FileSpreadsheet, Search } from 'lucide-react';
import { fetchProductsReport, formatCount, formatPrice } from '../../api';
import { ReportShell, TableSkeleton } from './ReportShell';
import { exportToExcel } from '../../utils/exportExcel';
import { monthStartIsoDate, todayIsoDate } from '../../utils/reportDates';

interface ProductsReportTabProps {
  onPeriodChange?: (period: string) => void;
}

export function ProductsReportTab({ onPeriodChange }: ProductsReportTabProps) {
  const [from, setFrom] = useState(monthStartIsoDate());
  const [to, setTo] = useState(todayIsoDate());
  const [applied, setApplied] = useState({ from: monthStartIsoDate(), to: todayIsoDate() });

  const query = useQuery({
    queryKey: ['report-products', applied.from, applied.to],
    queryFn: () => fetchProductsReport(applied.from, applied.to),
  });

  const rows = query.data ?? [];
  const isEmpty = !query.isLoading && !query.isError && rows.length === 0;

  useEffect(() => {
    onPeriodChange?.(`الفترة: ${applied.from} — ${applied.to}`);
  }, [applied.from, applied.to, onPeriodChange]);

  const totals = rows.reduce(
    (acc, row) => ({
      revenue: acc.revenue + row.revenue,
      profit: acc.profit + row.profit,
      qty: acc.qty + row.qtySold,
    }),
    { revenue: 0, profit: 0, qty: 0 },
  );

  function handleExportExcel() {
    const sorted = [...rows].sort((a, b) => b.profit - a.profit);
    exportToExcel(
      `تقرير-منتجات-${applied.from}_${applied.to}.xlsx`,
      'المنتجات',
      ['المنتج', 'الكمية المباعة', 'الإيراد', 'التكلفة', 'الربح'],
      sorted.map((r) => [r.name, r.qtySold, r.revenue, r.cost, r.profit]),
      [25, 15, 18, 18, 18],
    );
  }

  function handleApply() {
    const next = { from, to };
    if (applied.from === next.from && applied.to === next.to) {
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
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-blue-500" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          إلى
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-blue-500" />
        </label>
        <button type="button" onClick={handleApply} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          <Search className="h-4 w-4" />
          عرض
        </button>
        {rows.length > 0 && (
          <>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <FileDown className="h-4 w-4" />
              طباعة / PDF
            </button>
            <button type="button" onClick={handleExportExcel} className="inline-flex items-center gap-2 rounded-lg border border-green-600 px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50">
              <FileSpreadsheet className="h-4 w-4" />
              تصدير Excel
            </button>
          </>
        )}
      </div>

      <ReportShell loading={query.isLoading} error={query.isError ? (query.error as Error).message : null} isEmpty={isEmpty} onRetry={() => void query.refetch()} skeleton={<TableSkeleton cols={5} rows={8} />}>
        <div className="print-area space-y-4">
          <div className="print-summary-grid grid gap-4 sm:grid-cols-3">
            <div className="print-summary-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="print-summary-card__label text-sm text-slate-500">إجمالي الإيراد</p>
              <p className="print-summary-card__value mt-1 text-xl font-bold">{formatPrice(totals.revenue)}</p>
            </div>
            <div className="print-summary-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="print-summary-card__label text-sm text-slate-500">إجمالي الربح</p>
              <p className="print-summary-card__value mt-1 text-xl font-bold">{formatPrice(totals.profit)}</p>
            </div>
            <div className="print-summary-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="print-summary-card__label text-sm text-slate-500">الكمية المباعة</p>
              <p className="print-summary-card__value mt-1 text-xl font-bold">{formatCount(totals.qty)}</p>
            </div>
          </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-4 py-3 text-start font-semibold">المنتج</th>
                <th className="px-4 py-3 text-start font-semibold">الكمية</th>
                <th className="px-4 py-3 text-start font-semibold">الإيراد</th>
                <th className="px-4 py-3 text-start font-semibold">التكلفة</th>
                <th className="px-4 py-3 text-start font-semibold">الربح</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.productId} className="border-b border-slate-100">
                  <td className="px-4 py-2">{row.name}</td>
                  <td className="px-4 py-2">{formatCount(row.qtySold)}</td>
                  <td className="px-4 py-2">{formatPrice(row.revenue)}</td>
                  <td className="px-4 py-2">{formatPrice(row.cost)}</td>
                  <td className="px-4 py-2 font-medium text-green-700">{formatPrice(row.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </ReportShell>
    </div>
  );
}
