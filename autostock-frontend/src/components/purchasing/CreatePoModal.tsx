import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { fetchProducts, fetchSuppliers } from '../../api';
import type { Product, PurchaseOrder } from '../../types';
import {
  formatCartonConversion,
  piecesToDisplayQty,
  productUnitsPerCarton,
  storedCartonCostToPieceCost,
  supportsCarton,
  type QtyUnit,
} from '../../utils/units';

export interface PoLineForm {
  key: string;
  productId: string;
  productLabel: string;
  qty: string;
  unitCost: string;
  qtyUnit: QtyUnit;
  unitsPerCarton: number;
}

export interface CreatePoFormValues {
  supplierId: string;
  supplierLabel: string;
  items: PoLineForm[];
}

interface CreatePoModalProps {
  open: boolean;
  purchaseOrder?: PurchaseOrder | null;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: CreatePoFormValues) => void;
}

function newLine(): PoLineForm {
  return {
    key: crypto.randomUUID(),
    productId: '',
    productLabel: '',
    qty: '',
    unitCost: '',
    qtyUnit: 'carton',
    unitsPerCarton: 1,
  };
}

export function CreatePoModal({
  open,
  purchaseOrder,
  saving,
  error,
  onClose,
  onSubmit,
}: CreatePoModalProps) {
  const isEdit = !!purchaseOrder;
  const [supplierId, setSupplierId] = useState('');
  const [supplierLabel, setSupplierLabel] = useState('');
  const [lines, setLines] = useState<PoLineForm[]>([newLine()]);

  useEffect(() => {
    if (!open) return;
    if (purchaseOrder) {
      setSupplierId(purchaseOrder.supplierId);
      setSupplierLabel(purchaseOrder.supplier?.name ?? '');
      setLines(
        purchaseOrder.items.map((item) => {
          const upc = item.product?.unitsPerCarton ?? 1;
          const qtyUnit: QtyUnit = supportsCarton(upc) ? 'carton' : 'piece';
          const qtyPieces = parseFloat(String(item.qty));
          const storedCost = parseFloat(String(item.unitCost));
          const displayQty = piecesToDisplayQty(qtyPieces, qtyUnit, upc);
          const displayCost =
            qtyUnit === 'piece' && upc > 1
              ? storedCartonCostToPieceCost(storedCost, upc)
              : storedCost;

          return {
            key: crypto.randomUUID(),
            productId: item.productId,
            productLabel: item.product?.name
              ? `${item.product.name} (${item.product.sku ?? ''})`
              : item.productId,
            qty: String(displayQty),
            unitCost: String(displayCost),
            qtyUnit,
            unitsPerCarton: upc,
          };
        }),
      );
    } else {
      setSupplierId('');
      setSupplierLabel('');
      setLines([newLine()]);
    }
  }, [open, purchaseOrder]);

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', 'po-dropdown'],
    queryFn: () => fetchSuppliers({ limit: 500, page: 1 }),
    enabled: open,
  });

  const productsQuery = useQuery({
    queryKey: ['products', 'po-dropdown'],
    queryFn: () => fetchProducts({ limit: 500, page: 1 }),
    enabled: open,
  });

  const suppliers = suppliersQuery.data?.items ?? [];
  const products = productsQuery.data?.items ?? [];

  if (!open) return null;

  function selectProduct(lineKey: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      updateLine(lineKey, { productId: '', productLabel: '' });
      return;
    }
    updateLine(lineKey, {
      productId: product.id,
      productLabel: `${product.name} (${product.sku})`,
      unitCost: String(product.costPrice),
      unitsPerCarton: product.unitsPerCarton ?? 1,
      qtyUnit: supportsCarton(product.unitsPerCarton) ? 'carton' : 'piece',
    });
  }

  function updateLine(key: string, patch: Partial<PoLineForm>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function switchLineUnit(key: string, newUnit: QtyUnit) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key || line.qtyUnit === newUnit) return line;

        const upc = productUnitsPerCarton(line.unitsPerCarton);
        const currentQty = parseFloat(line.qty);
        const currentCost = parseFloat(line.unitCost);

        if (!Number.isFinite(currentQty) || currentQty <= 0 || !Number.isFinite(currentCost)) {
          return { ...line, qtyUnit: newUnit };
        }

        if (line.qtyUnit === 'carton' && newUnit === 'piece') {
          return {
            ...line,
            qtyUnit: newUnit,
            qty: String(currentQty * upc),
            unitCost: String(storedCartonCostToPieceCost(currentCost, upc)),
          };
        }

        if (line.qtyUnit === 'piece' && newUnit === 'carton') {
          return {
            ...line,
            qtyUnit: newUnit,
            qty: String(currentQty / upc),
            unitCost: String(currentCost * upc),
          };
        }

        return { ...line, qtyUnit: newUnit };
      }),
    );
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.key !== key)));
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const selected = suppliers.find((s) => s.id === supplierId);
    onSubmit({
      supplierId,
      supplierLabel: selected?.name ?? supplierLabel,
      items: lines,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">
            {isEdit ? 'تعديل أمر الشراء' : 'أمر شراء جديد'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-auto p-6">
            <label className="block text-sm font-medium text-slate-700">
              المورّد
              <select
                value={supplierId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSupplierId(id);
                  const s = suppliers.find((x) => x.id === id);
                  setSupplierLabel(s?.name ?? '');
                }}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="">— اختر المورد —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.phone ? ` — ${s.phone}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">البنود</p>
                <button
                  type="button"
                  onClick={addLine}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  إضافة بند
                </button>
              </div>

              <div className="space-y-3">
                {lines.map((line, index) => (
                  <div
                    key={line.key}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">بند {index + 1}</span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <label className="mb-3 block text-xs font-medium text-slate-600">
                      المنتج
                      <select
                        value={line.productId}
                        onChange={(e) => selectProduct(line.key, e.target.value)}
                        required
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="">— اختر المنتج —</option>
                        {products.map((p: Product) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      {supportsCarton(line.unitsPerCarton) && (
                        <div className="col-span-2 flex gap-1">
                          {(['piece', 'carton'] as const).map((unit) => (
                            <button
                              key={unit}
                              type="button"
                              onClick={() => switchLineUnit(line.key, unit)}
                              className={[
                                'rounded-md px-3 py-1.5 text-xs font-bold transition',
                                line.qtyUnit === unit
                                  ? 'bg-blue-600 text-white'
                                  : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
                              ].join(' ')}
                            >
                              {unit === 'piece' ? 'قطعة' : 'كارتون'}
                            </button>
                          ))}
                        </div>
                      )}
                      <label className="text-xs font-medium text-slate-600">
                        {line.qtyUnit === 'carton' ? 'عدد الكراتين' : 'الكمية (قطع)'}
                        <input
                          type="text"
                          inputMode="decimal"
                          value={line.qty}
                          onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                          required
                          placeholder="0"
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                        />
                        {(() => {
                          const inputQty = parseFloat(line.qty);
                          const hint = formatCartonConversion(
                            inputQty,
                            line.qtyUnit,
                            line.unitsPerCarton,
                          );
                          return hint ? (
                            <p className="mt-1 text-xs font-medium text-blue-700">{hint}</p>
                          ) : null;
                        })()}
                      </label>
                      <label className="text-xs font-medium text-slate-600">
                        {line.qtyUnit === 'carton' ? 'سعر الكارتون' : 'سعر القطعة'}
                        <input
                          type="text"
                          inputMode="decimal"
                          value={line.unitCost}
                          onChange={(e) => updateLine(line.key, { unitCost: e.target.value })}
                          required
                          placeholder="0"
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!productsQuery.isLoading && products.length === 0 && (
              <p className="text-xs text-amber-700">لا توجد منتجات — أضف منتجاً أولاً</p>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
          </div>

          <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving || !supplierId || products.length === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                'حفظ الأمر'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
