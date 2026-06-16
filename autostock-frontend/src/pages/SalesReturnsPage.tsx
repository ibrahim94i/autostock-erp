import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, RotateCcw, Search } from 'lucide-react';
import {
  createSaleReturn,
  fetchLocations,
  fetchReceipts,
  fetchSaleInvoice,
  formatDateTime,
  formatPrice,
  parseQuantity,
} from '../api';
import type { CreateSaleReturnPayload, Receipt, SaleInvoiceResponse } from '../types';
import { monthStartIsoDate, todayIsoDate } from '../utils/reportDates';

interface ReturnLineState {
  productId: string;
  productName: string;
  sku: string;
  soldQty: number;
  returnedQty: number;
  returnQty: number;
  unitPrice: number;
  unitCost: number;
}

function buildReturnLines(invoice: SaleInvoiceResponse): ReturnLineState[] {
  const returnedMap = invoice.returnedByProduct ?? {};

  return invoice.items.map((item) => {
    const soldQty = parseQuantity(item.qty);
    const returnedQty = parseQuantity(returnedMap[item.productId] ?? 0);

    return {
      productId: item.productId,
      productName: item.product.name,
      sku: item.product.sku,
      soldQty,
      returnedQty,
      returnQty: 0,
      unitPrice: parseQuantity(item.unitPrice),
      unitCost: parseQuantity(item.unitCost),
    };
  });
}

export function SalesReturnsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [lines, setLines] = useState<ReturnLineState[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastRequest, setLastRequest] = useState('');
  const [lastResponse, setLastResponse] = useState('');

  const receiptsQuery = useQuery({
    queryKey: ['sales-return-search', appliedSearch],
    queryFn: () =>
      fetchReceipts({
        from: monthStartIsoDate(),
        to: todayIsoDate(),
        search: appliedSearch,
      }),
    enabled: appliedSearch.length > 0,
  });

  const invoiceQuery = useQuery({
    queryKey: ['sale-invoice-return', selectedReceipt?.saleId],
    queryFn: () => fetchSaleInvoice(selectedReceipt!.saleId),
    enabled: !!selectedReceipt?.saleId,
  });

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  });

  useEffect(() => {
    if (!invoiceQuery.data) return;
    setLines(buildReturnLines(invoiceQuery.data));
    setError('');
    setSuccess('');
  }, [invoiceQuery.data]);

  const locationId = locationsQuery.data?.[0]?.id ?? '';

  const selectedLines = useMemo(
    () => lines.filter((line) => line.returnQty > 0),
    [lines],
  );

  const refundAmount = useMemo(
    () =>
      selectedLines.reduce(
        (sum, line) => sum + line.returnQty * line.unitPrice,
        0,
      ),
    [selectedLines],
  );

  const returnMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReceipt || !invoiceQuery.data) {
        throw new Error('اختر فاتورة أولاً');
      }
      if (!locationId) {
        throw new Error('لا يوجد موقع مخزون');
      }
      if (selectedLines.length === 0) {
        throw new Error('حدد كمية مرتجعة واحدة على الأقل');
      }
      if (!reason.trim()) {
        throw new Error('سبب الإرجاع مطلوب');
      }

      const refundMethod =
        invoiceQuery.data.sale.paymentType === 'debt' ? 'credit' : 'cash';

      const payload: CreateSaleReturnPayload = {
        items: selectedLines.map((line) => ({
          productId: line.productId,
          locationId,
          qty: line.returnQty,
          unitCost: line.unitCost,
        })),
        refundMethod,
        reason: reason.trim(),
        refundAmount,
      };

      setLastRequest(JSON.stringify(payload, null, 2));

      const result = await createSaleReturn(
        selectedReceipt.saleId,
        payload,
        crypto.randomUUID(),
      );

      setLastResponse(JSON.stringify(result, null, 2));

      if (result.status === 'REJECTED') {
        throw new Error(result.reason ?? 'تم رفض المرتجع');
      }

      return result;
    },
    onSuccess: async () => {
      setSuccess('تم تسجيل المرتجع بنجاح');
      setReason('');
      await invoiceQuery.refetch();
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
    setSelectedReceipt(null);
    setLines([]);
    setError('');
    setSuccess('');
  }

  function setLineQty(productId: string, value: number) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.productId !== productId) return line;
        const maxReturnable = Math.max(0, line.soldQty - line.returnedQty);
        const returnQty = Math.min(Math.max(0, value), maxReturnable);
        return { ...line, returnQty };
      }),
    );
  }

  function handleFullReturn() {
    setLines((prev) =>
      prev.map((line) => ({
        ...line,
        returnQty: Math.max(0, line.soldQty - line.returnedQty),
      })),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          مرتجعات المبيعات
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          ابحث عن فاتورة سابقة وأرجع كامل أو جزئي مع تحديث المخزون والمحاسبة
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            رقم الفاتورة أو معرف البيع
          </label>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="مثال: INV-00042"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Search className="h-4 w-4" />
          بحث
        </button>
      </form>

      {receiptsQuery.isFetching && appliedSearch && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          جاري البحث...
        </div>
      )}

      {receiptsQuery.data && receiptsQuery.data.length > 0 && !selectedReceipt && (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">الفاتورة</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">العميل</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">المبلغ</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">التاريخ</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {receiptsQuery.data.map((receipt) => (
                <tr key={receipt.id}>
                  <td className="px-4 py-3 text-sm">{receipt.invoiceNumber}</td>
                  <td className="px-4 py-3 text-sm">{receipt.customerName ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">{formatPrice(receipt.totalAmount)}</td>
                  <td className="px-4 py-3 text-sm">{formatDateTime(receipt.printedAt)}</td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      type="button"
                      onClick={() => setSelectedReceipt(receipt)}
                      className="rounded-lg bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      اختيار
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {appliedSearch && receiptsQuery.data?.length === 0 && !receiptsQuery.isFetching && (
        <p className="text-sm text-amber-600">لا توجد فواتير مطابقة للبحث.</p>
      )}

      {selectedReceipt && invoiceQuery.data && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                فاتورة {selectedReceipt.invoiceNumber}
              </h2>
              <p className="text-sm text-gray-500">
                {formatDateTime(invoiceQuery.data.sale.createdAt)} —{' '}
                {invoiceQuery.data.sale.paymentType === 'debt' ? 'آجل' : 'نقد'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleFullReturn}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              <RotateCcw className="h-4 w-4" />
              إرجاع كامل
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-right text-xs">المنتج</th>
                  <th className="px-3 py-2 text-right text-xs">SKU</th>
                  <th className="px-3 py-2 text-right text-xs">مباع</th>
                  <th className="px-3 py-2 text-right text-xs">مرتجع سابق</th>
                  <th className="px-3 py-2 text-right text-xs">متاح للإرجاع</th>
                  <th className="px-3 py-2 text-right text-xs">كمية الإرجاع</th>
                  <th className="px-3 py-2 text-right text-xs">سعر الوحدة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {lines.map((line) => {
                  const maxReturnable = Math.max(0, line.soldQty - line.returnedQty);
                  return (
                    <tr key={line.productId}>
                      <td className="px-3 py-2 text-sm">{line.productName}</td>
                      <td className="px-3 py-2 text-sm">{line.sku}</td>
                      <td className="px-3 py-2 text-sm">{line.soldQty}</td>
                      <td className="px-3 py-2 text-sm">{line.returnedQty}</td>
                      <td className="px-3 py-2 text-sm">{maxReturnable}</td>
                      <td className="px-3 py-2 text-sm">
                        <input
                          type="number"
                          min={0}
                          max={maxReturnable}
                          step="any"
                          value={line.returnQty || ''}
                          disabled={maxReturnable === 0}
                          onChange={(event) =>
                            setLineQty(line.productId, Number(event.target.value))
                          }
                          className="w-24 rounded border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm">{formatPrice(line.unitPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">سبب الإرجاع</label>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-500">طريقة الاسترداد:</span>{' '}
                {invoiceQuery.data.sale.paymentType === 'debt' ? 'خصم من رصيد العميل' : 'نقد'}
              </p>
              <p>
                <span className="text-gray-500">مبلغ الاسترداد:</span>{' '}
                <strong>{formatPrice(refundAmount)}</strong>
              </p>
              <p>
                <span className="text-gray-500">موقع الإرجاع:</span>{' '}
                {locationsQuery.data?.[0]
                  ? `${locationsQuery.data[0].zone} / ${locationsQuery.data[0].shelf}`
                  : '—'}
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <button
            type="button"
            disabled={returnMutation.isPending || selectedLines.length === 0}
            onClick={() => returnMutation.mutate()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {returnMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            تأكيد المرتجع
          </button>

          {(lastRequest || lastResponse) && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">Request Payload</p>
                <pre className="max-h-48 overflow-auto rounded bg-gray-100 p-2 text-xs dark:bg-gray-800">
                  {lastRequest}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">Response Body</p>
                <pre className="max-h-48 overflow-auto rounded bg-gray-100 p-2 text-xs dark:bg-gray-800">
                  {lastResponse}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
