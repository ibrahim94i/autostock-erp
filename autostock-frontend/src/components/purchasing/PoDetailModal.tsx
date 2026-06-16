import { Loader2, X } from 'lucide-react';
import {
  fetchPurchaseOrder,
  formatDateTime,
  formatPrice,
  poLineTotal,
  poTotal,
  shortId,
} from '../../api';
import { useQuery } from '@tanstack/react-query';

import type { Product } from '../../types';

interface PoDetailModalProps {
  poId: string | null;
  productCatalog?: Map<string, Product>;
  onClose: () => void;
}

function statusBadge(status: string): { label: string; className: string } {
  if (status === 'received') {
    return { label: 'مستلم', className: 'bg-green-100 text-green-800' };
  }
  return { label: 'مسودة', className: 'bg-amber-100 text-amber-800' };
}

function resolveProductLabel(
  productId: string,
  product: { name?: string; sku?: string } | undefined,
  catalog: Map<string, Product> | undefined,
): { name: string; sku?: string } {
  if (product?.name) {
    return { name: product.name, sku: product.sku };
  }

  const fromCatalog = catalog?.get(productId);
  if (fromCatalog) {
    return { name: fromCatalog.name, sku: fromCatalog.sku };
  }

  return { name: productId.slice(0, 8) };
}

export function PoDetailModal({ poId, productCatalog, onClose }: PoDetailModalProps) {
  const detailQuery = useQuery({
    queryKey: ['purchase-orders', poId],
    queryFn: () => fetchPurchaseOrder(poId!),
    enabled: !!poId,
  });

  if (!poId) return null;

  const po = detailQuery.data;
  const badge = po ? statusBadge(po.status) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">تفاصيل أمر الشراء</h3>
            {po && (
              <p className="mt-0.5 font-mono text-sm text-slate-500">{shortId(po.id)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-6">
          {detailQuery.isLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              جاري التحميل...
            </div>
          )}

          {detailQuery.isError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {detailQuery.error instanceof Error
                ? detailQuery.error.message
                : 'فشل تحميل التفاصيل'}
            </p>
          )}

          {po && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">المورّد</p>
                  <p className="font-semibold text-slate-900">{po.supplier?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">التاريخ</p>
                  <p className="font-semibold text-slate-900">{formatDateTime(po.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">الحالة</p>
                  {badge && (
                    <span
                      className={[
                        'mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        badge.className,
                      ].join(' ')}
                    >
                      {badge.label}
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[500px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <th className="px-4 py-3 text-right font-semibold">المنتج</th>
                      <th className="px-4 py-3 text-right font-semibold">الكمية</th>
                      <th className="px-4 py-3 text-right font-semibold">سعر الشراء</th>
                      <th className="px-4 py-3 text-right font-semibold">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.map((item) => {
                      const productLabel = resolveProductLabel(
                        item.productId,
                        item.product,
                        productCatalog,
                      );
                      return (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="px-4 py-3">
                          <p className="font-medium">{productLabel.name}</p>
                          {productLabel.sku && (
                            <p className="text-xs text-slate-400">{productLabel.sku}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">{item.qty.toString()}</td>
                        <td className="px-4 py-3">{formatPrice(item.unitCost)}</td>
                        <td className="px-4 py-3 font-semibold">
                          {formatPrice(poLineTotal(item.qty, item.unitCost))}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50">
                      <td colSpan={3} className="px-4 py-3 text-left font-bold text-slate-700">
                        الإجمالي الكلي
                      </td>
                      <td className="px-4 py-3 text-lg font-bold text-slate-900">
                        {formatPrice(poTotal(po.items))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
