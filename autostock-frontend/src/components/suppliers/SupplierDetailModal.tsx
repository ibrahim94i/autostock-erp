import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Pencil, Wallet, X } from 'lucide-react';
import {
  balanceColorClass,
  fetchPurchaseOrders,
  fetchSupplierBalance,
  formatDateTime,
  formatPrice,
  poTotal,
  shortId,
} from '../../api';
import type { Supplier } from '../../types';

interface SupplierDetailModalProps {
  supplier: Supplier | null;
  onClose: () => void;
  onPay: (supplier: Supplier, balance: number) => void;
  onEdit?: (supplier: Supplier) => void;
}

function poStatusBadge(status: string): { label: string; className: string } {
  if (status === 'received') {
    return { label: 'مستلم', className: 'bg-green-100 text-green-800' };
  }
  return { label: 'مسودة', className: 'bg-amber-100 text-amber-800' };
}

export function SupplierDetailModal({ supplier, onClose, onPay, onEdit }: SupplierDetailModalProps) {
  const balanceQuery = useQuery({
    queryKey: ['suppliers', supplier?.id, 'balance'],
    queryFn: () => fetchSupplierBalance(supplier!.id),
    enabled: !!supplier,
  });

  const ordersQuery = useQuery({
    queryKey: ['purchase-orders', 'supplier-detail'],
    queryFn: () => fetchPurchaseOrders({ limit: 100, page: 1 }),
    enabled: !!supplier,
  });

  const supplierOrders = useMemo(() => {
    if (!supplier) return [];
    return (ordersQuery.data?.items ?? [])
      .filter((po) => po.supplierId === supplier.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [ordersQuery.data, supplier]);

  if (!supplier) return null;

  const balance = balanceQuery.data ? parseFloat(String(balanceQuery.data.balance)) : 0;
  const balanceLoading = balanceQuery.isLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">تفاصيل المورّد</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">الاسم</p>
              <p className="font-semibold text-slate-900">{supplier.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">الهاتف</p>
              <p className="font-semibold text-slate-900">{supplier.phone || '—'}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">الرصيد الحالي</p>
            {balanceLoading ? (
              <div className="mt-1 flex items-center gap-2 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري التحميل...
              </div>
            ) : balanceQuery.isError ? (
              <p className="mt-1 text-sm text-red-600">فشل تحميل الرصيد</p>
            ) : (
              <p className={`mt-1 text-2xl ${balanceColorClass(balance)}`}>
                {formatPrice(balance)} د.ع
                {balance > 0 && (
                  <span className="ms-2 text-sm font-normal text-orange-600">(دين علينا)</span>
                )}
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">آخر أوامر الشراء</p>
            {ordersQuery.isLoading && (
              <p className="text-sm text-slate-500">جاري التحميل...</p>
            )}
            {!ordersQuery.isLoading && supplierOrders.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">
                لا توجد أوامر شراء لهذا المورّد
              </p>
            )}
            {supplierOrders.length > 0 && (
              <ul className="space-y-2">
                {supplierOrders.map((po) => {
                  const badge = poStatusBadge(po.status);
                  return (
                    <li
                      key={po.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-mono text-xs text-slate-500">{shortId(po.id)}</p>
                        <p className="text-slate-600">{formatDateTime(po.createdAt)}</p>
                      </div>
                      <div className="text-end">
                        <span
                          className={[
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                            badge.className,
                          ].join(' ')}
                        >
                          {badge.label}
                        </span>
                        <p className="mt-1 font-semibold">{formatPrice(poTotal(po.items))}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-200 px-6 py-4">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(supplier)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-300 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              <Pencil className="h-4 w-4" />
              تعديل البيانات
            </button>
          )}
          {balance > 0 && !balanceLoading && (
            <button
              type="button"
              onClick={() => onPay(supplier, balance)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Wallet className="h-4 w-4" />
              تسجيل دفعة
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={[
              'rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50',
              balance > 0 && !balanceLoading ? 'flex-1' : 'w-full',
            ].join(' ')}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
