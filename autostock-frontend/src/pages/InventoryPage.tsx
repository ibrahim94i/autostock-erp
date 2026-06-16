import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ClipboardList, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  apiFetch,
  fetchLocations,
  fetchLowAlerts,
  fetchProducts,
  fetchStockBalances,
  formatLocation,
  parseApiError,
  parseQuantity,
  UnauthorizedError,
} from '../api';
import type { Product, ReconcileStockPayload, StockBalanceItem } from '../types';
import { ReconcileModal, type ReconcileFormValues } from '../components/inventory/ReconcileModal';
import { TouchButton } from '../components/ui/TouchButton';
import { useSettings } from '../context/SettingsContext';
import { printInventoryVoucher } from '../pos/inventoryVoucherPrint';
import { formatStockWithCartons, supportsCarton, toPieceQty } from '../utils/units';

const PAGE_SIZE = 15;

type Tab = 'balances' | 'alerts';

function resolveInventoryTab(tabParam: string | null): Tab {
  if (tabParam === 'low-alerts') return 'alerts';
  return 'balances';
}

function alertSeverity(
  quantity: number,
  minStockAlert: number,
): 'critical' | 'low' {
  if (quantity <= 0 || quantity < minStockAlert * 0.5) return 'critical';
  return 'low';
}

function balanceRowClass(quantity: number, minStockAlert: number | undefined): string {
  if (minStockAlert === undefined) return '';
  if (quantity <= 0) return 'bg-red-50';
  if (quantity < minStockAlert) return 'bg-amber-50';
  return '';
}

function newClientUuid(): string {
  return crypto.randomUUID();
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

function resolveBalanceProduct(
  row: StockBalanceItem,
  catalog: Map<string, Product> | undefined,
): StockBalanceItem['product'] {
  if (row.product?.name) {
    return row.product;
  }

  const fromCatalog = catalog?.get(row.productId);
  if (!fromCatalog) {
    return row.product;
  }

  return {
    id: fromCatalog.id,
    sku: fromCatalog.sku,
    name: fromCatalog.name,
    minStockAlert: fromCatalog.minStockAlert,
    unitsPerCarton: fromCatalog.unitsPerCarton,
  };
}

async function reconcileStockRequest(
  payload: ReconcileStockPayload,
  clientUuid: string,
): Promise<{ status: 'APPLIED' | 'REJECTED'; reason?: string; idempotent?: boolean }> {
  const res = await apiFetch('/stock/reconcile', {
    method: 'POST',
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

export function InventoryPage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const clientUuidRef = useRef(newClientUuid());

  const [tab, setTab] = useState<Tab>(() => resolveInventoryTab(searchParams.get('tab')));
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [productFilterId, setProductFilterId] = useState('');
  const [productFilterLabel, setProductFilterLabel] = useState('');
  const [locationFilterId, setLocationFilterId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [reconcileMode, setReconcileMode] = useState<'create' | 'edit'>('create');
  const [reconcileInitial, setReconcileInitial] = useState<{
    productId: string;
    productLabel: string;
    locationId: string;
    actualQty: string;
    reason?: string;
    previousQty: number;
  } | null>(null);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    document.title = 'المخزون — AutoStock ERP';
  }, []);

  useEffect(() => {
    setTab(resolveInventoryTab(searchParams.get('tab')));
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(''), 6000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  });

  const productSuggestionsQuery = useQuery({
    queryKey: ['products', 'inventory-filter', debouncedSearch],
    queryFn: () =>
      fetchProducts({
        search: debouncedSearch || undefined,
        limit: 8,
        page: 1,
      }),
    enabled: debouncedSearch.length > 0 && !productFilterId,
  });

  const balancesQuery = useQuery({
    queryKey: [
      'stock',
      'balances',
      { productId: productFilterId, locationId: locationFilterId, page, limit: PAGE_SIZE },
    ],
    queryFn: () =>
      fetchStockBalances({
        productId: productFilterId || undefined,
        locationId: locationFilterId || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const productsCatalogQuery = useQuery({
    queryKey: ['products', 'inventory-catalog'],
    queryFn: fetchAllProductsCatalog,
    enabled: tab === 'balances',
    staleTime: 60_000,
  });

  const alertsQuery = useQuery({
    queryKey: ['stock', 'low-alerts'],
    queryFn: fetchLowAlerts,
  });

  useEffect(() => {
    for (const err of [locationsQuery.error, balancesQuery.error, alertsQuery.error]) {
      if (err instanceof UnauthorizedError) {
        navigate('/login', { replace: true, state: { message: err.message } });
        return;
      }
    }
  }, [locationsQuery.error, balancesQuery.error, alertsQuery.error, navigate]);

  const reconcileMutation = useMutation({
    mutationFn: async (
      values: ReconcileFormValues & { productLabel: string; unitsPerCarton: number },
    ) => {
      const inputQty = parseFloat(values.actualQty);
      if (Number.isNaN(inputQty) || inputQty < 0) {
        throw new Error('الكمية الفعلية غير صالحة');
      }
      const qty = toPieceQty(inputQty, values.qtyUnit, values.unitsPerCarton);
      if (!values.reason.trim()) {
        throw new Error('السبب مطلوب');
      }
      if (!values.productId) {
        throw new Error('يرجى اختيار منتج');
      }
      if (!values.locationId) {
        throw new Error('يرجى اختيار موقع');
      }

      const payload: ReconcileStockPayload = {
        reason: values.reason.trim(),
        items: [
          {
            productId: values.productId,
            locationId: values.locationId,
            actualQty: qty,
          },
        ],
      };

      const result = await reconcileStockRequest(payload, clientUuidRef.current);

      if (result.status === 'REJECTED') {
        throw new Error(result.reason ?? 'تم رفض العملية');
      }

      return {
        actualQty: qty,
        productId: values.productId,
        locationId: values.locationId,
        productLabel: values.productLabel,
      };
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['stock'] });
      await queryClient.refetchQueries({ queryKey: ['stock', 'balances'] });
      clientUuidRef.current = newClientUuid();

      if (reconcileInitial && reconcileMode === 'edit') {
        printInventoryVoucher({
          type: 'edit',
          voucherNumber: `INV-EDIT-${Date.now().toString(36).toUpperCase()}`,
          companyName: settings.companyName,
          productName: data.productLabel.split(' (')[0] ?? data.productLabel,
          sku: data.productLabel.match(/\(([^)]+)\)/)?.[1] ?? '—',
          locationLabel:
            locations.find((l) => l.id === data.locationId)?.code ?? data.locationId,
          previousQty: reconcileInitial.previousQty,
          newQty: data.actualQty,
          reason: 'تعديل مخزون',
          appliedAt: new Date().toISOString(),
        });
      }

      setModalOpen(false);
      setReconcileInitial(null);
      setReconcileMode('create');
      setFormError('');
      setSuccessMessage(`تمت التسوية بنجاح — الكمية الجديدة: ${data.actualQty}`);
      setTab('balances');
      setProductFilterId(data.productId);
      setProductFilterLabel(data.productLabel);
      setPage(1);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const locations = locationsQuery.data ?? [];
  const balances = balancesQuery.data?.items ?? [];
  const productCatalog = productsCatalogQuery.data;
  const alerts = alertsQuery.data ?? [];

  function clearProductFilter() {
    setProductFilterId('');
    setProductFilterLabel('');
    setSearchInput('');
    setPage(1);
  }

  function applyProductFilter(id: string, label: string) {
    setProductFilterId(id);
    setProductFilterLabel(label);
    setSearchInput('');
    setPage(1);
  }

  function openCreateModal() {
    setReconcileMode('create');
    setReconcileInitial(null);
    setFormError('');
    setModalOpen(true);
  }

  async function handleDeleteBalance(row: StockBalanceItem, productName: string, sku: string) {
    if (!window.confirm(`حذف مخزون "${productName}" من هذا الموقع؟`)) return;

    const previousQty = parseQuantity(row.quantity);
    const payload: ReconcileStockPayload = {
      reason: 'حذف مخزون',
      items: [{ productId: row.productId, locationId: row.locationId, actualQty: 0 }],
    };

    try {
      const result = await reconcileStockRequest(payload, newClientUuid());
      if (result.status === 'REJECTED') {
        window.alert(result.reason ?? 'فشل الحذف');
        return;
      }

      printInventoryVoucher({
        type: 'delete',
        voucherNumber: `INV-DEL-${Date.now().toString(36).toUpperCase()}`,
        companyName: settings.companyName,
        productName,
        sku,
        locationLabel: row.location ? formatLocation(row.location) : row.locationId,
        previousQty,
        newQty: 0,
        reason: 'حذف مخزون',
        appliedAt: new Date().toISOString(),
      });

      await queryClient.invalidateQueries({ queryKey: ['stock'] });
      setSuccessMessage('تم حذف رصيد المخزون');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'فشل الحذف');
    }
  }

  function openEditBalance(
    row: StockBalanceItem,
    productName: string,
    sku: string,
    qty: number,
  ) {
    setReconcileMode('edit');
    setReconcileInitial({
      productId: row.productId,
      productLabel: `${productName} (${sku})`,
      locationId: row.locationId,
      actualQty: String(qty),
      reason: 'تعديل مخزون',
      previousQty: qty,
    });
    setFormError('');
    setModalOpen(true);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">المخزون</h2>
          <p className="mt-1 text-sm text-slate-500">أرصدة المخزون، التنبيهات، والتسوية</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          تسوية / إدخال مخزون
        </button>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          {successMessage}
        </div>
      )}

      <div className="mb-4 flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('balances')}
          className={[
            'inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition',
            tab === 'balances'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800',
          ].join(' ')}
        >
          <Package className="h-4 w-4" />
          أرصدة المخزون
        </button>
        <button
          type="button"
          onClick={() => setTab('alerts')}
          className={[
            'inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition',
            tab === 'alerts'
              ? 'border-amber-500 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800',
          ].join(' ')}
        >
          <AlertTriangle className="h-4 w-4" />
          تنبيهات النقص
          {alerts.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
              {alerts.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'balances' && (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="بحث منتج بالاسم أو SKU..."
                disabled={!!productFilterId}
                className="w-full rounded-lg border border-slate-300 py-2.5 pr-10 pl-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50"
              />
              {!productFilterId && debouncedSearch && (
                <ul className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                  {(productSuggestionsQuery.data?.items ?? []).map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => applyProductFilter(p.id, `${p.name} (${p.sku})`)}
                        className="w-full px-3 py-2 text-start text-sm hover:bg-slate-50"
                      >
                        {p.name} — <span className="text-slate-400">{p.sku}</span>
                      </button>
                    </li>
                  ))}
                  {!productSuggestionsQuery.isLoading &&
                    (productSuggestionsQuery.data?.items.length ?? 0) === 0 && (
                      <li className="px-3 py-2 text-sm text-slate-400">لا توجد نتائج</li>
                    )}
                </ul>
              )}
            </div>

            <label className="text-sm font-medium text-slate-700">
              الموقع
              <select
                value={locationFilterId}
                onChange={(e) => {
                  setLocationFilterId(e.target.value);
                  setPage(1);
                }}
                className="mt-1 block w-full min-w-[180px] rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 sm:w-auto"
              >
                <option value="">الكل</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {formatLocation(loc)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {productFilterId && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
              <ClipboardList className="h-4 w-4" />
              فلتر: {productFilterLabel}
              <button
                type="button"
                onClick={clearProductFilter}
                className="font-medium text-blue-600 hover:underline"
              >
                إزالة
              </button>
            </div>
          )}

          {balancesQuery.isLoading && (
            <p className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              جاري التحميل...
            </p>
          )}

          {balancesQuery.isError && !(balancesQuery.error instanceof UnauthorizedError) && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {balancesQuery.error instanceof Error
                ? balancesQuery.error.message
                : 'فشل تحميل الأرصدة'}
            </p>
          )}

          {!balancesQuery.isLoading && !balancesQuery.isError && balances.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-slate-500">لا توجد أرصدة مخزون</p>
              <p className="mt-2 text-sm text-slate-400">
                استخدم «تسوية / إدخال مخزون» لإدخال مخزون أولي
              </p>
            </div>
          )}

          {!balancesQuery.isLoading && !balancesQuery.isError && balances.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[700px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <th className="px-4 py-3 text-right font-semibold">المنتج</th>
                      <th className="px-4 py-3 text-right font-semibold">SKU</th>
                      <th className="px-4 py-3 text-right font-semibold">الموقع</th>
                      <th className="px-4 py-3 text-right font-semibold">الكمية</th>
                      <th className="px-4 py-3 text-right font-semibold">حد التنبيه</th>
                      <th className="px-4 py-3 text-right font-semibold">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map((row) => {
                      const qty = parseQuantity(row.quantity);
                      const product = resolveBalanceProduct(row, productCatalog);
                      const minAlert = product?.minStockAlert;
                      const unitsPerCarton =
                        productCatalog?.get(row.productId)?.unitsPerCarton ??
                        (product as { unitsPerCarton?: number } | undefined)?.unitsPerCarton ??
                        1;
                      const qtyLabel = supportsCarton(unitsPerCarton)
                        ? formatStockWithCartons(qty, unitsPerCarton)
                        : String(qty);
                      return (
                        <tr
                          key={`${row.productId}-${row.locationId}`}
                          className={[
                            'border-b border-slate-100',
                            balanceRowClass(qty, minAlert),
                          ].join(' ')}
                        >
                          <td className="px-4 py-3 font-medium">
                            {product?.name ?? row.productId.slice(0, 8)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            {product?.sku ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            {row.location ? formatLocation(row.location) : row.locationId.slice(0, 8)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={[
                                'font-bold',
                                minAlert !== undefined && qty < minAlert
                                  ? qty <= 0
                                    ? 'text-red-700'
                                    : 'text-amber-700'
                                  : 'text-slate-900',
                              ].join(' ')}
                            >
                              {qtyLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{minAlert ?? '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <TouchButton
                                type="button"
                                onClick={() =>
                                  openEditBalance(
                                    row,
                                    product?.name ?? row.productId,
                                    product?.sku ?? '—',
                                    qty,
                                  )
                                }
                                className="gap-1 border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 lg:min-h-0 lg:min-w-0"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                تعديل
                              </TouchButton>
                              <TouchButton
                                type="button"
                                onClick={() =>
                                  void handleDeleteBalance(
                                    row,
                                    product?.name ?? row.productId,
                                    product?.sku ?? '—',
                                  )
                                }
                                className="gap-1 border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 lg:min-h-0 lg:min-w-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                حذف
                              </TouchButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {balancesQuery.data && balancesQuery.data.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
                  <p className="text-slate-600">
                    صفحة {balancesQuery.data.page} من {balancesQuery.data.totalPages} — إجمالي{' '}
                    {balancesQuery.data.total}
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
                      disabled={page >= balancesQuery.data.totalPages}
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
        </>
      )}

      {tab === 'alerts' && (
        <>
          {alertsQuery.isLoading && (
            <p className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
              جاري التحميل...
            </p>
          )}

          {alertsQuery.isError && !(alertsQuery.error instanceof UnauthorizedError) && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {alertsQuery.error instanceof Error
                ? alertsQuery.error.message
                : 'فشل تحميل التنبيهات'}
            </p>
          )}

          {!alertsQuery.isLoading && !alertsQuery.isError && alerts.length === 0 && (
            <p className="rounded-xl border border-green-200 bg-green-50 p-10 text-center text-green-800">
              لا توجد منتجات تحت الحد الأدنى — المخزون جيد
            </p>
          )}

          {!alertsQuery.isLoading && !alertsQuery.isError && alerts.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[700px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-4 py-3 text-right font-semibold">المنتج</th>
                    <th className="px-4 py-3 text-right font-semibold">SKU</th>
                    <th className="px-4 py-3 text-right font-semibold">الموقع</th>
                    <th className="px-4 py-3 text-right font-semibold">الكمية</th>
                    <th className="px-4 py-3 text-right font-semibold">الحد الأدنى</th>
                    <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => {
                    const qty = parseQuantity(alert.quantity);
                    const severity = alertSeverity(qty, alert.minStockAlert);
                    return (
                      <tr
                        key={`${alert.productId}-${alert.locationId}`}
                        className={[
                          'border-b border-slate-100',
                          severity === 'critical' ? 'bg-red-50' : 'bg-amber-50',
                        ].join(' ')}
                      >
                        <td className="px-4 py-3 font-medium">{alert.product.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {alert.product.sku}
                        </td>
                        <td className="px-4 py-3">{formatLocation(alert.location)}</td>
                        <td
                          className={[
                            'px-4 py-3 font-bold',
                            severity === 'critical' ? 'text-red-700' : 'text-amber-700',
                          ].join(' ')}
                        >
                          {qty}
                        </td>
                        <td className="px-4 py-3">{alert.minStockAlert}</td>
                        <td className="px-4 py-3">
                          <span
                            className={[
                              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                              severity === 'critical'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800',
                            ].join(' ')}
                          >
                            {severity === 'critical' ? 'حرج' : 'منخفض'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ReconcileModal
        open={modalOpen}
        title={reconcileMode === 'edit' ? 'تعديل مخزون' : undefined}
        initialValues={
          reconcileInitial
            ? {
                productId: reconcileInitial.productId,
                productLabel: reconcileInitial.productLabel,
                locationId: reconcileInitial.locationId,
                actualQty: reconcileInitial.actualQty,
                reason: reconcileInitial.reason,
              }
            : undefined
        }
        locations={locations}
        saving={reconcileMutation.isPending}
        error={formError}
        onClose={() => {
          if (reconcileMutation.isPending) return;
          setModalOpen(false);
          setReconcileInitial(null);
          setReconcileMode('create');
          setFormError('');
        }}
        onSubmit={(values) => reconcileMutation.mutate(values)}
      />
    </div>
  );
}
