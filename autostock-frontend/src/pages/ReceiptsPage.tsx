import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Loader2, Printer, Search } from 'lucide-react';
import {
  fetchReceipts,
  fetchSaleInvoice,
  formatDateTime,
  formatPrice,
  logReceipt,
  parseQuantity,
  UnauthorizedError,
} from '../api';
import { useSettings, normalizeReceiptSize } from '../context/SettingsContext';
import type { CompanySettings, Receipt, SaleInvoiceResponse } from '../types';
import {
  computeInvoiceTotals,
  printInvoice,
  viewInvoice,
  type InvoiceData,
  type ReceiptSize,
} from '../pos/invoicePrint';
import { monthStartIsoDate, todayIsoDate } from '../utils/reportDates';

function buildInvoiceFromSale(
  receipt: Receipt,
  invoice: SaleInvoiceResponse,
  settings: CompanySettings,
): InvoiceData {
  const subtotal = parseQuantity(invoice.sale.subtotal);
  const totals = computeInvoiceTotals(subtotal, settings.defaultTaxRate);
  const paymentType = invoice.sale.paymentType === 'debt' ? 'debt' : 'cash';
  const priceType = invoice.sale.type === 'wholesale' ? 'wholesale' : 'retail';

  return {
    invoiceNumber: receipt.invoiceNumber,
    saleId: receipt.saleId,
    appliedAt: invoice.sale.createdAt,
    companyName: settings.companyName,
    companyPhone: settings.companyPhone ?? undefined,
    companyAddress: settings.companyAddress ?? undefined,
    companyLogo: settings.companyLogo ?? undefined,
    taxNumber: settings.taxNumber ?? undefined,
    currency: settings.currency,
    receiptFooter: settings.defaultReceiptFooter,
    paymentType,
    priceType,
    customerId: invoice.sale.customerId ?? undefined,
    customerName: receipt.customerName ?? invoice.sale.customer?.name ?? undefined,
    lines: invoice.items.map((item) => {
      const qty = parseQuantity(item.qty);
      const unitPrice = parseQuantity(item.unitPrice);
      return {
        productName: item.product.name,
        sku: item.product.sku,
        qty,
        unitPrice,
        lineTotal: qty * unitPrice,
      };
    }),
    ...totals,
  };
}

export function ReceiptsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const receiptSize: ReceiptSize = normalizeReceiptSize(settings.receiptSize);

  const [from, setFrom] = useState(monthStartIsoDate());
  const [to, setTo] = useState(todayIsoDate());
  const [searchInput, setSearchInput] = useState('');
  const [applied, setApplied] = useState({
    from: monthStartIsoDate(),
    to: todayIsoDate(),
    search: '',
  });
  const [reprintError, setReprintError] = useState('');
  const [reprintingId, setReprintingId] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'الوصولات — AutoStock ERP';
    const today = todayIsoDate();
    const monthStart = monthStartIsoDate();
    setFrom(monthStart);
    setTo(today);
    setApplied((prev) => ({ ...prev, from: monthStart, to: today }));
  }, []);

  const receiptsQuery = useQuery({
    queryKey: ['receipts', applied],
    queryFn: () =>
      fetchReceipts({
        from: applied.from || undefined,
        to: applied.to || undefined,
        search: applied.search || undefined,
      }),
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (receiptsQuery.error instanceof UnauthorizedError) {
      navigate('/login', { replace: true, state: { message: receiptsQuery.error.message } });
    }
  }, [receiptsQuery.error, navigate]);

  const logMutation = useMutation({
    mutationFn: logReceipt,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });

  async function handleView(receipt: Receipt) {
    setReprintError('');
    setReprintingId(receipt.id);
    try {
      const invoice = await fetchSaleInvoice(receipt.saleId);
      const invoiceData = buildInvoiceFromSale(receipt, invoice, settings);
      const ok = viewInvoice(invoiceData, receiptSize);
      if (!ok) {
        setReprintError('تعذّر فتح نافذة العرض — اسمح بالنوافذ المنبثقة');
      }
    } catch (err) {
      setReprintError(err instanceof Error ? err.message : 'فشل عرض الوصل');
    } finally {
      setReprintingId(null);
    }
  }

  async function handleReprint(receipt: Receipt) {
    setReprintError('');
    setReprintingId(receipt.id);
    try {
      const invoice = await fetchSaleInvoice(receipt.saleId);
      const invoiceData = buildInvoiceFromSale(receipt, invoice, settings);
      const ok = printInvoice(invoiceData, receiptSize);
      if (!ok) {
        setReprintError('تعذّر فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة');
        return;
      }
      await logMutation.mutateAsync({
        saleId: receipt.saleId,
        invoiceNumber: receipt.invoiceNumber,
        customerName: receipt.customerName ?? undefined,
        totalAmount: parseQuantity(receipt.totalAmount),
      });
    } catch (err) {
      setReprintError(err instanceof Error ? err.message : 'فشل إعادة الطباعة');
    } finally {
      setReprintingId(null);
    }
  }

  const items = receiptsQuery.data ?? [];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">سجل الوصولات</h2>
        <p className="mt-1 text-sm text-slate-500">سجل فواتير المبيعات — تُسجَّل تلقائياً بعد كل بيع</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-end">
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
        <label className="min-w-[220px] flex-1 text-sm font-medium text-slate-700">
          بحث
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="رقم الفاتورة أو اسم العميل..."
              className="w-full rounded-lg border border-slate-300 py-2 pr-10 pl-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </label>
        <button
          type="button"
          onClick={() => setApplied({ from, to, search: searchInput.trim() })}
          className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900"
        >
          تطبيق
        </button>
      </div>

      {reprintError && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {reprintError}
        </p>
      )}

      {receiptsQuery.isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          جاري التحميل...
        </div>
      )}

      {receiptsQuery.isError && !(receiptsQuery.error instanceof UnauthorizedError) && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {receiptsQuery.error instanceof Error
            ? receiptsQuery.error.message
            : 'فشل تحميل الوصولات'}
        </p>
      )}

      {!receiptsQuery.isLoading && !receiptsQuery.isError && items.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          لا توجد وصولات في هذه الفترة
        </p>
      )}

      {!receiptsQuery.isLoading && !receiptsQuery.isError && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-4 py-3 text-right font-semibold">رقم الفاتورة</th>
                <th className="px-4 py-3 text-right font-semibold">العميل</th>
                <th className="px-4 py-3 text-right font-semibold">المبلغ</th>
                <th className="px-4 py-3 text-right font-semibold">وقت الطباعة</th>
                <th className="px-4 py-3 text-right font-semibold">مرات الطباعة</th>
                <th className="px-4 py-3 text-right font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {items.map((receipt) => (
                <tr key={receipt.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{receipt.invoiceNumber}</td>
                  <td className="px-4 py-3">{receipt.customerName ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold">
                    {formatPrice(parseQuantity(receipt.totalAmount))}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateTime(receipt.printedAt)}
                  </td>
                  <td className="px-4 py-3 text-center font-bold">{receipt.printCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleView(receipt)}
                        disabled={reprintingId === receipt.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        عرض
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleReprint(receipt)}
                        disabled={reprintingId === receipt.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        {reprintingId === receipt.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Printer className="h-3.5 w-3.5" />
                        )}
                        إعادة طباعة
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
