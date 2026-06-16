import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import {
  balanceColorClass,
  createPayment,
  createSupplier,
  deleteSupplier,
  fetchSupplierBalance,
  fetchSuppliers,
  formatPrice,
  parseQuantity,
  UnauthorizedError,
  updateSupplier,
} from '../api';
import {
  CreateSupplierModal,
  type CreateSupplierFormValues,
} from '../components/suppliers/CreateSupplierModal';
import { PaymentModal } from '../components/suppliers/PaymentModal';
import { SupplierDetailModal } from '../components/suppliers/SupplierDetailModal';
import type { Supplier } from '../types';

const PAGE_SIZE = 20;

function newClientUuid(): string {
  return crypto.randomUUID();
}

export function SuppliersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const paymentUuidRef = useRef(newClientUuid());

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [createError, setCreateError] = useState('');
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);
  const [payTarget, setPayTarget] = useState<{ supplier: Supplier; balance: number } | null>(null);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    document.title = 'الموردون — AutoStock ERP';
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(''), 6000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', { search: debouncedSearch, page, limit: PAGE_SIZE }],
    queryFn: () =>
      fetchSuppliers({
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const supplierItems = suppliersQuery.data?.items ?? [];

  const balanceQueries = useQueries({
    queries: supplierItems.map((supplier) => ({
      queryKey: ['suppliers', supplier.id, 'balance'],
      queryFn: () => fetchSupplierBalance(supplier.id),
      enabled: supplierItems.length > 0,
    })),
  });

  const balanceBySupplierId = useMemo(() => {
    const map = new Map<string, number>();
    for (const query of balanceQueries) {
      if (query.data) {
        map.set(query.data.supplierId, parseQuantity(query.data.balance));
      }
    }
    return map;
  }, [balanceQueries]);

  useEffect(() => {
    if (suppliersQuery.error instanceof UnauthorizedError) {
      navigate('/login', { replace: true, state: { message: suppliersQuery.error.message } });
    }
  }, [suppliersQuery.error, navigate]);

  const createMutation = useMutation({
    mutationFn: (values: CreateSupplierFormValues) =>
      createSupplier({
        name: values.name.trim(),
        ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setCreateOpen(false);
      setCreateError('');
      setSuccessMessage('تم إضافة المورّد بنجاح');
    },
    onError: (err: Error) => setCreateError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CreateSupplierFormValues }) =>
      updateSupplier(id, {
        name: values.name.trim(),
        ...(values.phone.trim() ? { phone: values.phone.trim() } : { phone: '' }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setEditingSupplier(null);
      setDetailSupplier(null);
      setCreateError('');
      setSuccessMessage('تم تحديث بيانات المورد بنجاح');
    },
    onError: (err: Error) => setCreateError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setDetailSupplier(null);
      setSuccessMessage('تم حذف المورد');
    },
    onError: (err: Error) => window.alert(err.message),
  });

  const payMutation = useMutation({
    mutationFn: async ({ supplier, amount }: { supplier: Supplier; amount: number }) => {
      if (Number.isNaN(amount) || amount <= 0) {
        throw new Error('مبلغ الدفعة غير صالح');
      }

      const result = await createPayment(
        {
          partyType: 'SUPPLIER',
          partyId: supplier.id,
          amount,
          direction: 'OUT',
          method: 'cash',
        },
        paymentUuidRef.current,
      );

      if (result.status === 'REJECTED') {
        throw new Error(result.reason);
      }

      return supplier;
    },
    onSuccess: (supplier) => {
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      void queryClient.invalidateQueries({ queryKey: ['suppliers', supplier.id, 'balance'] });
      paymentUuidRef.current = newClientUuid();
      setPayTarget(null);
      setPayError('');
      setDetailSupplier(null);
      setSuccessMessage('تم تسجيل الدفعة بنجاح');
    },
    onError: (err: Error) => setPayError(err.message),
  });

  function openPay(supplier: Supplier, balance: number) {
    paymentUuidRef.current = newClientUuid();
    setPayError('');
    setPayTarget({ supplier, balance });
  }

  const balancesLoading = balanceQueries.some((q) => q.isLoading);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">الموردون</h2>
          <p className="mt-1 text-sm text-slate-500">إدارة الموردين وأرصدتهم</p>
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
          مورّد جديد
        </button>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          {successMessage}
        </div>
      )}

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف..."
            className="w-full rounded-lg border border-slate-300 py-2.5 pr-10 pl-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {suppliersQuery.isLoading && (
        <p className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          جاري التحميل...
        </p>
      )}

      {suppliersQuery.isError && !(suppliersQuery.error instanceof UnauthorizedError) && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {suppliersQuery.error instanceof Error
            ? suppliersQuery.error.message
            : 'فشل تحميل الموردين'}
        </p>
      )}

      {!suppliersQuery.isLoading && !suppliersQuery.isError && supplierItems.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          لا يوجد موردون
          {debouncedSearch ? ` مطابقون لـ "${debouncedSearch}"` : ''}
        </p>
      )}

      {!suppliersQuery.isLoading && !suppliersQuery.isError && supplierItems.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-4 py-3 text-right font-semibold">الاسم</th>
                  <th className="px-4 py-3 text-right font-semibold">الهاتف</th>
                  <th className="px-4 py-3 text-right font-semibold">الرصيد</th>
                  <th className="px-4 py-3 text-right font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {supplierItems.map((supplier) => {
                  const balance = balanceBySupplierId.get(supplier.id);
                  return (
                    <tr
                      key={supplier.id}
                      onClick={() => setDetailSupplier(supplier)}
                      className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">{supplier.name}</td>
                      <td className="px-4 py-3 text-slate-600">{supplier.phone || '—'}</td>
                      <td className="px-4 py-3">
                        {balancesLoading && balance === undefined ? (
                          <span className="text-slate-400">...</span>
                        ) : (
                          <span className={balanceColorClass(balance ?? 0)}>
                            {formatPrice(balance ?? 0)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCreateError('');
                            setEditingSupplier(supplier);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`حذف المورد "${supplier.name}"؟`)) {
                              deleteMutation.mutate(supplier.id);
                            }
                          }}
                          className="ms-1 inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          حذف
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {suppliersQuery.data && suppliersQuery.data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
              <p className="text-slate-600">
                صفحة {suppliersQuery.data.page} من {suppliersQuery.data.totalPages} — إجمالي{' '}
                {suppliersQuery.data.total} مورّد
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
                  disabled={page >= suppliersQuery.data.totalPages}
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

      <CreateSupplierModal
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

      <CreateSupplierModal
        open={!!editingSupplier}
        supplier={editingSupplier}
        saving={updateMutation.isPending}
        error={createError}
        onClose={() => {
          if (updateMutation.isPending) return;
          setEditingSupplier(null);
          setCreateError('');
        }}
        onSubmit={(values) => {
          if (!editingSupplier) return;
          updateMutation.mutate({ id: editingSupplier.id, values });
        }}
      />

      <SupplierDetailModal
        supplier={detailSupplier}
        onClose={() => setDetailSupplier(null)}
        onPay={openPay}
        onEdit={(supplier) => {
          setCreateError('');
          setEditingSupplier(supplier);
        }}
      />

      <PaymentModal
        open={!!payTarget}
        supplierName={payTarget?.supplier.name ?? ''}
        balance={payTarget?.balance ?? 0}
        saving={payMutation.isPending}
        error={payError}
        onClose={() => {
          if (payMutation.isPending) return;
          setPayTarget(null);
          setPayError('');
        }}
        onSubmit={(amount) => {
          if (!payTarget) return;
          payMutation.mutate({ supplier: payTarget.supplier, amount });
        }}
      />
    </div>
  );
}
