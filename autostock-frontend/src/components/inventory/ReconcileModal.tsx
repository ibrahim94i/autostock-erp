import { useEffect, useState, type FormEvent } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Loader2, X } from 'lucide-react';

import { fetchProducts, formatLocation } from '../../api';

import type { Location } from '../../types';

import {
  dualQtyToPieces,
  formatDualInputPreview,
  supportsCarton,
  type QtyUnit,
} from '../../utils/units';



export interface ReconcileFormValues {

  productId: string;

  locationId: string;

  actualQty: string;

  qtyUnit: QtyUnit;

  reason: string;

}



interface ReconcileModalProps {

  open: boolean;

  locations: Location[];

  saving: boolean;

  error: string;

  title?: string;

  initialValues?: {

    productId: string;

    productLabel: string;

    locationId: string;

    actualQty: string;

    reason?: string;

  };

  onClose: () => void;

  onSubmit: (values: ReconcileFormValues & { productLabel: string; unitsPerCarton: number }) => void;

}



function productOptionLabel(name: string, sku: string): string {

  return `${name} (${sku})`;

}



export function ReconcileModal({

  open,

  locations,

  saving,

  error,

  title,

  initialValues,

  onClose,

  onSubmit,

}: ReconcileModalProps) {

  const [productId, setProductId] = useState('');

  const [productLabel, setProductLabel] = useState('');

  const [locationId, setLocationId] = useState('');

  const [actualQty, setActualQty] = useState('');
  const [cartonQty, setCartonQty] = useState('');
  const [loosePieceQty, setLoosePieceQty] = useState('');

  const [reason, setReason] = useState('إدخال مخزون أولي');



  useEffect(() => {

    if (!open) return;

    if (initialValues) {

      setProductId(initialValues.productId);

      setProductLabel(initialValues.productLabel);

      setLocationId(initialValues.locationId);

      setActualQty(initialValues.actualQty);
      setCartonQty('');
      setLoosePieceQty('');

      setReason(initialValues.reason ?? 'تعديل مخزون');

    } else {

      setProductId('');

      setProductLabel('');

      setActualQty('');
      setCartonQty('');
      setLoosePieceQty('');

      setReason('إدخال مخزون أولي');

    }

  }, [open, initialValues]);

  useEffect(() => {

    if (!open) return;

    if (locations.length > 0 && !locationId) {

      setLocationId(locations[0].id);

    }

  }, [open, locations, locationId]);



  const productsQuery = useQuery({

    queryKey: ['products', 'reconcile', 'all'],

    queryFn: () => fetchProducts({ limit: 1000, page: 1 }),

    enabled: open,

  });



  const products = productsQuery.data?.items ?? [];



  if (!open) return null;



  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const upc = unitsPerCarton;
    const totalPieces = supportsCarton(upc)
      ? dualQtyToPieces(parseFloat(cartonQty) || 0, parseFloat(loosePieceQty) || 0, upc)
      : parseFloat(actualQty) || 0;

    onSubmit({
      productId,
      locationId,
      actualQty: String(totalPieces),
      qtyUnit: 'piece',
      reason,
      productLabel,
      unitsPerCarton,
    });
  }



  function handleProductChange(nextProductId: string) {

    setProductId(nextProductId);

    const product = products.find((p) => p.id === nextProductId);

    setProductLabel(product ? productOptionLabel(product.name, product.sku) : '');

    setCartonQty('');
    setLoosePieceQty('');
    setActualQty('');
  }



  const selectedProduct = products.find((p) => p.id === productId);

  const unitsPerCarton = selectedProduct?.unitsPerCarton ?? 1;



  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

          <h3 className="text-lg font-bold text-slate-900">{title ?? 'تسوية / إدخال مخزون'}</h3>

          <button

            type="button"

            onClick={onClose}

            disabled={saving}

            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"

          >

            <X className="h-5 w-5" />

          </button>

        </div>



        <form onSubmit={handleSubmit} className="space-y-4 p-6">

          <label className="block text-sm font-medium text-slate-700">

            المنتج

            {productsQuery.isLoading ? (

              <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-500">

                <Loader2 className="h-4 w-4 animate-spin" />

                جاري تحميل المنتجات...

              </div>

            ) : productsQuery.isError ? (

              <p className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">

                {productsQuery.error instanceof Error

                  ? productsQuery.error.message

                  : 'فشل تحميل المنتجات'}

              </p>

            ) : (

              <select

                value={productId}

                onChange={(e) => handleProductChange(e.target.value)}

                required

                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"

              >

                <option value="">— اختر منتجاً —</option>

                {products.map((product) => (

                  <option key={product.id} value={product.id}>

                    {productOptionLabel(product.name, product.sku)}

                  </option>

                ))}

              </select>

            )}

          </label>



          <label className="block text-sm font-medium text-slate-700">

            الموقع

            <select

              value={locationId}

              onChange={(e) => setLocationId(e.target.value)}

              required

              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500"

            >

              {locations.map((loc) => (

                <option key={loc.id} value={loc.id}>

                  {formatLocation(loc)}

                </option>

              ))}

            </select>

          </label>



          {supportsCarton(unitsPerCarton) ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">الكمية الفعلية</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium text-slate-700">
                  كراتين
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={cartonQty}
                    onChange={(e) => setCartonQty(e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  قطع مفردة
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={loosePieceQty}
                    onChange={(e) => setLoosePieceQty(e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>
              </div>
              {(parseFloat(cartonQty) > 0 || parseFloat(loosePieceQty) > 0) && (
                <p className="text-xs font-medium text-blue-700">
                  {formatDualInputPreview(
                    parseFloat(cartonQty) || 0,
                    parseFloat(loosePieceQty) || 0,
                    unitsPerCarton,
                  )}
                </p>
              )}
            </div>
          ) : (
          <label className="block text-sm font-medium text-slate-700">
            الكمية الفعلية (قطع)
            <input
              type="number"
              min={0}
              step="any"
              value={actualQty}
              onChange={(e) => setActualQty(e.target.value)}
              required
              placeholder="مثال: 100"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </label>
          )}



          <label className="block text-sm font-medium text-slate-700">

            السبب (إلزامي)

            <input

              type="text"

              value={reason}

              onChange={(e) => setReason(e.target.value)}

              required

              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"

            />

          </label>



          {error && (

            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>

          )}



          <div className="flex gap-3 pt-2">

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

              disabled={saving || !productId || productsQuery.isLoading}

              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"

            >

              {saving ? (

                <>

                  <Loader2 className="h-4 w-4 animate-spin" />

                  جاري الحفظ...

                </>

              ) : (

                'حفظ التسوية'

              )}

            </button>

          </div>

        </form>

      </div>

    </div>

  );

}

