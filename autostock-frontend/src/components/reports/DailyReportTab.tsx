import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown, FileSpreadsheet, Search } from 'lucide-react';
import {
  fetchCashHistory,
  fetchCashToday,
  fetchDailyReport,
  fetchExpenses,
  formatCount,
  formatPrice,
  parseQuantity,
} from '../../api';
import {
  CardsSkeleton,
  ReportShell,
  TableSkeleton,
} from './ReportShell';
import { exportToExcel } from '../../utils/exportExcel';
import { formatDisplayDate, todayIsoDate } from '../../utils/reportDates';

interface DailyReportTabProps {
  onPeriodChange?: (period: string) => void;
}

function ReportTable({
  title,
  headers,
  children,
}: {
  title: string;
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500">
              {headers.map((header) => (
                <th key={header} className="px-4 py-2 text-start font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function DailyReportTab({ onPeriodChange }: DailyReportTabProps) {
  const [date, setDate] = useState(todayIsoDate());
  const [appliedDate, setAppliedDate] = useState(todayIsoDate());

  const query = useQuery({
    queryKey: ['report-daily', appliedDate],
    queryFn: () => fetchDailyReport(appliedDate),
  });

  const expensesQuery = useQuery({
    queryKey: ['report-daily-expenses', appliedDate],
    queryFn: () => fetchExpenses({ from: appliedDate, to: appliedDate }),
  });

  const isToday = appliedDate === todayIsoDate();
  const cashQuery = useQuery({
    queryKey: ['report-daily-cash', appliedDate],
    queryFn: async () => {
      if (isToday) {
        const today = await fetchCashToday();
        return today.register && today.summary
          ? {
              opening: parseQuantity(today.register.openingBalance),
              totalIn: parseQuantity(today.summary.totalIn),
              totalOut: parseQuantity(today.summary.totalOut),
              closing: parseQuantity(today.summary.expectedBalance),
            }
          : null;
      }
      const history = await fetchCashHistory(appliedDate, appliedDate);
      const entry = history[0];
      if (!entry?.summary) return null;
      return {
        opening: parseQuantity(entry.openingBalance),
        totalIn: parseQuantity(entry.summary.totalIn),
        totalOut: parseQuantity(entry.summary.totalOut),
        closing: parseQuantity(entry.summary.expectedBalance),
      };
    },
  });

  useEffect(() => {
    onPeriodChange?.(`تاريخ التقرير: ${formatDisplayDate(appliedDate)}`);
  }, [appliedDate, onPeriodChange]);

  const data = query.data;
  const totalExpenses = parseQuantity(expensesQuery.data?.total ?? 0);
  const isEmpty =
    !!data &&
    data.salesCount === 0 &&
    data.totalSales === 0 &&
    data.paymentsReceived === 0 &&
    data.totalReturns === 0 &&
    totalExpenses === 0;

  function handleExportExcel() {
    if (!data) return;
    exportToExcel(
      `تقرير-يومي-${appliedDate}.xlsx`,
      'تقرير يومي',
      [
        'التاريخ',
        'إجمالي المبيعات',
        'صافي الربح',
        'عدد الفواتير',
        'المصاريف',
        'المرتجعات',
        'ديون جديدة',
        'دفعات مستلمة',
        'نقد',
        'آجل',
      ],
      [
        [
          appliedDate,
          data.totalSales,
          data.netProfit,
          data.salesCount,
          totalExpenses,
          data.totalReturns,
          data.totalNewDebt,
          data.paymentsReceived,
          data.paymentBreakdown.cash,
          data.paymentBreakdown.debt,
        ],
      ],
      [14, 16, 16, 14, 14, 14, 14, 16, 14, 14],
    );
  }

  function handlePrint() {
    window.print();
  }

  function handleApply() {
    if (date === appliedDate) {
      void query.refetch();
      return;
    }
    setAppliedDate(date);
  }

  const summaryCards = data
    ? [
        { label: 'إجمالي المبيعات', value: formatPrice(data.totalSales) },
        { label: 'صافي الربح', value: formatPrice(data.netProfit) },
        { label: 'عدد الفواتير', value: formatCount(data.salesCount) },
        { label: 'المصاريف', value: formatPrice(totalExpenses) },
        { label: 'إجمالي المرتجعات', value: formatPrice(data.totalReturns) },
        { label: 'دفعات مستلمة', value: formatPrice(data.paymentsReceived) },
      ]
    : [];

  const cash = cashQuery.data;

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end gap-3">
        <label className="block text-sm font-medium text-slate-700">
          التاريخ
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-blue-500"
          />
        </label>
        <button
          type="button"
          onClick={handleApply}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Search className="h-4 w-4" />
          عرض
        </button>
        {data && !isEmpty && (
          <>
            <div className="flex flex-col">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <FileDown className="h-4 w-4" />
                طباعة / حفظ PDF
              </button>
              <p className="mt-1 max-w-xs text-xs text-slate-500">
                لحفظ التقرير كملف PDF اختر «حفظ كـ PDF» من نافذة الطباعة
              </p>
            </div>
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
        skeleton={
          <div className="space-y-6">
            <CardsSkeleton count={6} />
            <TableSkeleton cols={4} />
            <TableSkeleton cols={4} />
          </div>
        }
      >
        {data && (
          <div className="print-area space-y-6">
            <div className="print-summary-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="print-summary-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="print-summary-card__label text-sm text-slate-500">
                    {card.label}
                  </p>
                  <p className="print-summary-card__value mt-2 text-2xl font-bold text-slate-900">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <ReportTable
              title="فواتير اليوم"
              headers={['رقم الفاتورة', 'العميل', 'المبلغ', 'طريقة الدفع']}
            >
              {data.invoices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    لا توجد فواتير في هذا اليوم
                  </td>
                </tr>
              ) : (
                data.invoices.map((invoice) => (
                  <tr key={invoice.saleId} className="border-b border-slate-50">
                    <td className="px-4 py-2 font-mono text-xs">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-2">{invoice.customerName}</td>
                    <td className="px-4 py-2 font-medium">{formatPrice(invoice.amount)}</td>
                    <td className="px-4 py-2">
                      <span
                        className={[
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          invoice.paymentType === 'cash'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800',
                        ].join(' ')}
                      >
                        {invoice.paymentLabel}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </ReportTable>

            <div className="grid gap-6 lg:grid-cols-2">
              <ReportTable
                title="أكثر 5 منتجات مبيعاً"
                headers={['#', 'المنتج', 'الكمية', 'الإيراد']}
              >
                {data.topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      لا توجد مبيعات منتجات
                    </td>
                  </tr>
                ) : (
                  data.topProducts.map((product, index) => (
                    <tr key={product.productId} className="border-b border-slate-50">
                      <td className="px-4 py-2 text-slate-400">{index + 1}</td>
                      <td className="px-4 py-2 font-medium">{product.name}</td>
                      <td className="px-4 py-2">{formatCount(product.qty)}</td>
                      <td className="px-4 py-2">{formatPrice(product.revenue)}</td>
                    </tr>
                  ))
                )}
              </ReportTable>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900">ملخص الصندوق</h3>
                <p className="mt-1 text-xs text-slate-500">حركة الصندوق النقدي لليوم</p>
                {cash ? (
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between border-b border-slate-100 py-2">
                      <span className="text-slate-600">الرصيد الافتتاحي</span>
                      <span className="font-semibold">{formatPrice(cash.opening)}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 py-2">
                      <span className="text-slate-600">إجمالي الداخل</span>
                      <span className="font-semibold text-emerald-700">
                        {formatPrice(cash.totalIn)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 py-2">
                      <span className="text-slate-600">إجمالي الخارج</span>
                      <span className="font-semibold text-red-700">
                        {formatPrice(cash.totalOut)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="font-bold text-slate-800">الرصيد الختامي</span>
                      <span className="text-lg font-bold text-blue-800">
                        {formatPrice(cash.closing)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">لا توجد بيانات صندوق لهذا اليوم</p>
                )}
              </div>
            </div>
          </div>
        )}
      </ReportShell>
    </div>
  );
}
