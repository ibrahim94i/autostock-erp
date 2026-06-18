import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, PackageCheck, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  apiFetch,
  deletePurchaseOrder,
  fetchLocations,
  fetchProducts,
  fetchPurchaseOrder,
  fetchPurchaseOrders,
  fetchSuppliers,
  formatDateTime,
  formatPrice,
  parseApiError,
  poTotal,
  shortId,
  UnauthorizedError,
  updatePurchaseOrder,
} from '../api';
import {
  CreatePoModal,
  type CreatePoFormValues,
} from '../components/purchasing/CreatePoModal';
import { PoDetailModal } from '../components/purchasing/PoDetailModal';
import { ReceivePoModal } from '../components/purchasing/ReceivePoModal';
import { TouchButton } from '../components/ui/TouchButton';
import type {
  CreatePurchaseOrderPayload,
  Product,
  PurchaseOrder,
  ReceivePurchaseOrderPayload,
  Supplier,
} from '../types';
import { buildPurchaseOrderItemPayload } from '../utils/units';

const PAGE_SIZE = 10;

type StatusFilter = '' | 'draft' | 'received';

function statusBadge(status: string): { label: string; className: string } {
  if (status === 'received') {
    return { label: 'مستلم', className: 'bg-green-100 text-green-800' };
  }
  return { label: 'مسودة', className: 'bg-amber-100 text-amber-800' };
}

function newClientUuid(): string {
  return crypto.randomUUID();
}

async function fetchAllSuppliersCatalog(): Promise<Map<string, Supplier>> {
  const map = new Map<string, Supplier>();
  let page = 1;
  let totalPages = 1;

  do {
    const batch = await fetchSuppliers({ page, limit: 100 });
    for (const supplier of batch.items) {
      map.set(supplier.id, supplier);
    }
    totalPages = batch.totalPages;
    page += 1;
  } while (page <= totalPages);

  return map;
}

async function fetchAllProductsCatalog(): Promise<Map<string, Product>> {
  const map = new Map<string, Product>();
  let page = 1;
  let totalPages = 1;

  do {
    const batch = await fetchProducts({ page, limit: 100 });
    for (const product of batch.items) {
      map.set(product.id, product);
    }
    totalPages = batch.totalPages;
    page += 1;
  } while (page <= totalPages);

  return map;
}

function resolveSupplierName(
  po: PurchaseOrder,
  catalog: Map<string, Supplier> | undefined,
): string {
  if (po.supplier?.name) return po.supplier.name;
  const fromCatalog = catalog?.get(po.supplierId);
  return fromCatalog?.name ?? shortId(po.supplierId);
}

async function createPurchaseOrderRequest(
  payload: CreatePurchaseOrderPayload,
): Promise<unknown> {
  const res = await apiFetch('/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json();
}

async function receivePurchaseOrderRequest(
  id: string,
  payload: ReceivePurchaseOrderPayload,
  clientUuid: string,
): Promise<{ status: 'APPLIED' | 'REJECTED'; reason?: string; idempotent?: boolean }> {
  const res = await apiFetch(`/purchase-orders/${id}/receive`, {
    method: 'PATCH',
    headers: {
      'x-client-uuid': clientUuid,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  const data = (await res.json()) as {
    status?: string;
    reason?: string;
    idempotent?: boolean;
  };

  if (data.status === 'REJECTED') {
    return {
      status: 'REJECTED',
      reason: data.reason ?? 'تم رفض العملية',
      idempotent: data.idempotent,
    };
  }

  if (data.status === 'APPLIED') {
    return { status: 'APPLIED', idempotent: data.idempotent };
  }

  return { status: 'REJECTED', reason: 'استجابة غير متوقعة من الخادم' };
}

export function PurchasingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const receiveUuidRef = useRef(newClientUuid());

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [successMessage, setSuccessMessage] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPo, setEditingPo] = useState<PurchaseOrder | null>(null);
  const [createError, setCreateError] = useState('');
  const [detailPoId, setDetailPoId] = useState<string | null>(null);
  const [receivePo, setReceivePo] = useState<PurchaseOrder | null>(null);
  const [receiveError, setReceiveError] = useState('');

  useEffect(() => {
    document.title = 'المشتريات — AutoStock ERP';
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(''), 6000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const ordersQuery = useQuery({
    queryKey: ['purchase-orders', { status: statusFilter, page, limit: PAGE_SIZE }],
    queryFn: () =>
      fetchPurchaseOrders({
        status: statusFilter || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  });

  const suppliersCatalogQuery = useQuery({
    queryKey: ['suppliers', 'catalog'],
    queryFn: fetchAllSuppliersCatalog,
    staleTime: 5 * 60 * 1000,
  });

  const productsCatalogQuery = useQuery({
    queryKey: ['products', 'catalog'],
    queryFn: fetchAllProductsCatalog,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    for (const err of [ordersQuery.error, locationsQuery.error]) {
      if (err instanceof UnauthorizedError) {
        navigate('/login', { replace: true, state: { message: err.message } });
        return;
      }
    }
  }, [ordersQuery.error, locationsQuery.error, navigate]);

  const createMutation = useMutation({
    mutationFn: async (values: CreatePoFormValues) => {
      if (!values.supplierId) throw new Error('يجب اختيار مورّد');

      const activeLines = values.items.filter((line) => line.productId.trim());
      if (activeLines.length === 0) throw new Error('أضف بنداً واحداً على الأقل');

      const items = activeLines.map((line) => {
        const inputQty = parseFloat(line.qty);
        const inputUnitCost = parseFloat(line.unitCost);
        if (Number.isNaN(inputQty) || inputQty <= 0) throw new Error('الكمية غير صالحة');
        if (Number.isNaN(inputUnitCost) || inputUnitCost <= 0) throw new Error('سعر الشراء غير صالح');
        return buildPurchaseOrderItemPayload(
          line.productId,
          inputQty,
          inputUnitCost,
          line.qtyUnit,
          line.unitsPerCarton,
        );
      });

      return createPurchaseOrderRequest({
        supplierId: values.supplierId,
        items,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      await queryClient.refetchQueries({ queryKey: ['purchase-orders'] });
      setCreateOpen(false);
      setCreateError('');
      setSuccessMessage('تم إنشاء أمر الشراء بنجاح');
      setPage(1);
    },
    onError: (err: Error) => setCreateError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CreatePoFormValues }) => {
      const activeLines = values.items.filter((line) => line.productId.trim());
      if (activeLines.length === 0) throw new Error('أضف بنداً واحداً على الأقل');
      const items = activeLines.map((line) => {
        const inputQty = parseFloat(line.qty);
        const inputUnitCost = parseFloat(line.unitCost);
        if (Number.isNaN(inputQty) || inputQty <= 0) throw new Error('الكمية غير صالحة');
        if (Number.isNaN(inputUnitCost) || inputUnitCost <= 0) throw new Error('سعر الشراء غير صالح');
        return buildPurchaseOrderItemPayload(
          line.productId,
          inputQty,
          inputUnitCost,
          line.qtyUnit,
          line.unitsPerCarton,
        );
      });
      return updatePurchaseOrder(id, { supplierId: values.supplierId, items });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setEditingPo(null);
      setCreateError('');
      setSuccessMessage('تم تحديث أمر الشراء');
    },
    onError: (err: Error) => setCreateError(err.message),
  });

  const deletePoMutation = useMutation({
    mutationFn: (id: string) => deletePurchaseOrder(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setSuccessMessage('تم حذف أمر الشراء');
    },
    onError: (err: Error) => window.alert(err.message),
  });

  const receiveMutation = useMutation({
    mutationFn: async ({ poId, locationId }: { poId: string; locationId: string }) => {
      if (!locationId) throw new Error('يجب اختيار موقع الاستلام');

      const locationExists = (locationsQuery.data ?? []).some((loc) => loc.id === locationId);
      if (!locationExists) {
        throw new Error('موقع الاستلام غير موجود — أعد تحميل الصفحة');
      }

      const result = await receivePurchaseOrderRequest(
        poId,
        { locationId },
        receiveUuidRef.current,
      );

      if (result.status === 'REJECTED') {
        throw new Error(result.reason);
      }

      return poId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      await queryClient.refetchQueries({ queryKey: ['purchase-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['stock'] });
      await queryClient.refetchQueries({ queryKey: ['stock', 'balances'] });
      receiveUuidRef.current = newClientUuid();
      setReceivePo(null);
      setReceiveError('');
      setSuccessMessage('تم استلام أمر الشراء بنجاح — تم تحديث المخزون');
    },
    onError: (err: Error) => setReceiveError(err.message),
  });

  const orders = ordersQuery.data?.items ?? [];
  const locations = locationsQuery.data ?? [];
  const suppliersCatalog = suppliersCatalogQuery.data;
  const productsCatalog = productsCatalogQuery.data;

  function openReceive(po: PurchaseOrder) {
    if (po.status !== 'draft') return;
    receiveUuidRef.current = newClientUuid();
    setReceiveError('');
    setReceivePo(po);
  }

  async function openEdit(po: PurchaseOrder) {
    if (po.status !== 'draft') return;
    try {
      const full = await fetchPurchaseOrder(po.id);
      setEditingPo(full);
      setCreateError('');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'فشل تحميل الأمر');
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">المشتريات</h2>
          <p className="mt-1 text-sm text-slate-500">أوامر الشراء واستلام المخزون</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateError('');
            setCreateOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          أمر شراء جديد
        </button>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          {successMessage}
        </div>
      )}

      <div className="mb-4">
        <label className="text-sm font-medium text-slate-700">
          فلتر الحالة
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(1);
            }}
            className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 sm:w-auto"
          >
            <option value="">الكل</option>
            <option value="draft">مسودة</option>
            <option value="received">مستلم</option>
          </select>
        </label>
      </div>

      {ordersQuery.isLoading && (
        <p className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          جاري التحميل...
        </p>
      )}

      {ordersQuery.isError && !(ordersQuery.error instanceof UnauthorizedError) && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {ordersQuery.error instanceof Error
            ? ordersQuery.error.message
            : 'فشل تحميل أوامر الشراء'}
        </p>
      )}

      {!ordersQuery.isLoading && !ordersQuery.isError && orders.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          لا توجد أوامر شراء
          {statusFilter ? ` بحالة «${statusFilter === 'draft' ? 'مسودة' : 'مستلم'}»` : ''}
        </p>
      )}

      {!ordersQuery.isLoading && !ordersQuery.isError && orders.length > 0 && (
        <>
          <div className="space-y-3 lg:hidden">
            {orders.map((po) => {
              const badge = statusBadge(po.status);
              const total = poTotal(po.items, productsCatalog);
              return (
                <div
                  key={po.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs text-slate-500">{shortId(po.id)}</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {resolveSupplierName(po, suppliersCatalog)}
                      </p>
                    </div>
                    <span
                      className={[
                        'inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        badge.className,
                      ].join(' ')}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">التاريخ</dt>
                      <dd>{formatDateTime(po.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">الإجمالي</dt>
                      <dd className="font-bold">{formatPrice(total)}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <TouchButton
                      type="button"
                      onClick={() => setDetailPoId(po.id)}
                      className="flex-1 border border-slate-200 text-slate-700 hover:bg-slate-100"
                    >
                      <Eye className="h-4 w-4" />
                      عرض
                    </TouchButton>
                    {po.status === 'draft' && (
                      <>
                        <TouchButton
                          type="button"
                          onClick={() => void openEdit(po)}
                          className="flex-1 border border-slate-200 text-slate-700 hover:bg-slate-100"
                        >
                          <Pencil className="h-4 w-4" />
                          تعديل
                        </TouchButton>
                        <TouchButton
                          type="button"
                          onClick={() => {
                            if (window.confirm('حذف أمر الشراء؟')) {
                              deletePoMutation.mutate(po.id);
                            }
                          }}
                          className="flex-1 border border-red-200 text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف
                        </TouchButton>
                        <TouchButton
                          type="button"
                          onClick={() => openReceive(po)}
                          className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <PackageCheck className="h-4 w-4" />
                          استلام
                        </TouchButton>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-4 py-3 text-right font-semibold">رقم الأمر</th>
                  <th className="px-4 py-3 text-right font-semibold">المورّد</th>
                  <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
                  <th className="px-4 py-3 text-right font-semibold">الإجمالي</th>
                  <th className="px-4 py-3 text-right font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((po) => {
                  const badge = statusBadge(po.status);
                  const total = poTotal(po.items, productsCatalog);
                  return (
                    <tr
                      key={po.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-mono text-xs">{shortId(po.id)}</td>
                      <td className="px-4 py-3 font-medium">
                        {resolveSupplierName(po, suppliersCatalog)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            badge.className,
                          ].join(' ')}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDateTime(po.createdAt)}</td>
                      <td className="px-4 py-3 font-semibold">{formatPrice(total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <TouchButton
                            type="button"
                            onClick={() => setDetailPoId(po.id)}
                            className="min-h-0 min-w-0 gap-1 border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            عرض
                          </TouchButton>
                          {po.status === 'draft' && (
                            <>
                              <TouchButton
                                type="button"
                                onClick={() => void openEdit(po)}
                                className="min-h-0 min-w-0 gap-1 border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                تعديل
                              </TouchButton>
                              <TouchButton
                                type="button"
                                onClick={() => {
                                  if (window.confirm('حذف أمر الشراء؟')) {
                                    deletePoMutation.mutate(po.id);
                                  }
                                }}
                                className="min-h-0 min-w-0 gap-1 border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                حذف
                              </TouchButton>
                              <TouchButton
                                type="button"
                                onClick={() => openReceive(po)}
                                className="min-h-0 min-w-0 gap-1 bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                              >
                                <PackageCheck className="h-3.5 w-3.5" />
                                استلام
                              </TouchButton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {ordersQuery.data && ordersQuery.data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
              <p className="text-slate-600">
                صفحة {ordersQuery.data.page} من {ordersQuery.data.totalPages} — إجمالي{' '}
                {ordersQuery.data.total} أمر
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
                >
                  السابق
                </button>
                <button
                  type="button"
                  disabled={page >= ordersQuery.data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <PoDetailModal
        poId={detailPoId}
        productCatalog={productsCatalog}
        onClose={() => setDetailPoId(null)}
      />

      <CreatePoModal
        open={createOpen}
        saving={createMutation.isPending}
        error={createError}
        onClose={() => {
          if (createMutation.isPending) return;
          setCreateOpen(false);
          setCreateError('');
        }}
        onSubmit={(values) => createMutation.mutate(values)}
      />

      <CreatePoModal
        open={!!editingPo}
        purchaseOrder={editingPo}
        saving={updateMutation.isPending}
        error={createError}
        onClose={() => {
          if (updateMutation.isPending) return;
          setEditingPo(null);
          setCreateError('');
        }}
        onSubmit={(values) => {
          if (!editingPo) return;
          updateMutation.mutate({ id: editingPo.id, values });
        }}
      />

      <ReceivePoModal
        open={!!receivePo}
        poId={receivePo?.id ?? null}
        poLabel={
          receivePo
            ? `${resolveSupplierName(receivePo, suppliersCatalog)} — ${shortId(receivePo.id)}`
            : ''
        }
        locations={locations}
        saving={receiveMutation.isPending}
        error={receiveError}
        onClose={() => {
          if (receiveMutation.isPending) return;
          setReceivePo(null);
          setReceiveError('');
        }}
        onSubmit={(locationId) => {
          if (!receivePo) return;
          receiveMutation.mutate({ poId: receivePo.id, locationId });
        }}
      />
    </div>
  );
}
