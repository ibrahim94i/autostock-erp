import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Loader2, Plus, X } from 'lucide-react';

import { createCategory, emptyProductForm, formatPrice, productToFormValues } from '../../api';
import { productUnitCost } from '../../pos/cartReducer';
import { productCartonCost } from '../../utils/productCost';
import { productUnitsPerCarton } from '../../utils/units';
import type { Category, Product, ProductFormValues } from '../../types';

function formatProductAverageCost(product: Product): string {
  return `${formatPrice(productCartonCost(product))} د.ع / كارتون`;
}

function formatPieceCostPreview(costPrice: string, unitsPerCarton: string): string | null {
  const carton = parseFloat(costPrice);
  const upc = productUnitsPerCarton(parseInt(unitsPerCarton, 10) || 1);
  if (Number.isNaN(carton) || carton <= 0 || upc <= 1) return null;
  return `≈ ${formatPrice(carton / upc)} د.ع للقطعة الواحدة`;
}



const UNIT_PRESETS = [

  'قطعة',

  'لتر',

  'كيلو',

  'كارتونة',

  'صندوق',

  'باليت',

  'تريلة',

] as const;



const UNIT_OTHER = '__other__';



interface ProductFormModalProps {

  open: boolean;

  mode: 'create' | 'edit';

  product?: Product | null;

  categories: Category[];

  categoriesLoading: boolean;

  saving: boolean;

  error: string;

  onClose: () => void;

  onSubmit: (values: ProductFormValues) => void;

}



function resolveUnitPreset(unit: string): { preset: string; custom: string } {

  if (UNIT_PRESETS.includes(unit as (typeof UNIT_PRESETS)[number])) {

    return { preset: unit, custom: '' };

  }

  if (unit.trim()) {

    return { preset: UNIT_OTHER, custom: unit };

  }

  return { preset: UNIT_PRESETS[0], custom: '' };

}



function unitValueFromPreset(preset: string, custom: string): string {

  return preset === UNIT_OTHER ? custom.trim() : preset;

}



export function ProductFormModal({

  open,

  mode,

  product,

  categories,

  categoriesLoading,

  saving,

  error,

  onClose,

  onSubmit,

}: ProductFormModalProps) {

  const queryClient = useQueryClient();

  const [values, setValues] = useState<ProductFormValues>(emptyProductForm());

  const [unitPreset, setUnitPreset] = useState<string>(UNIT_PRESETS[0]);

  const [unitCustom, setUnitCustom] = useState('');

  const [showAddCategory, setShowAddCategory] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState('');

  const [categoryAddError, setCategoryAddError] = useState('');



  useEffect(() => {

    if (!open) return;

    const initial = product ? productToFormValues(product) : emptyProductForm();

    const unitState = resolveUnitPreset(initial.unit);

    setValues(initial);

    setUnitPreset(unitState.preset);

    setUnitCustom(unitState.custom);

    setShowAddCategory(false);

    setNewCategoryName('');

    setCategoryAddError('');

  }, [open, product]);



  const createCategoryMutation = useMutation({

    mutationFn: (name: string) => createCategory({ name: name.trim() }),

    onSuccess: (category) => {

      void queryClient.invalidateQueries({ queryKey: ['categories'] });

      setValues((prev) => ({ ...prev, categoryId: category.id }));

      setShowAddCategory(false);

      setNewCategoryName('');

      setCategoryAddError('');

    },

    onError: (err: Error) => setCategoryAddError(err.message),

  });



  if (!open) return null;



  function handleChange(field: keyof ProductFormValues, value: string) {

    setValues((prev) => ({ ...prev, [field]: value }));

  }



  function handleUnitPresetChange(preset: string) {

    setUnitPreset(preset);

    handleChange('unit', unitValueFromPreset(preset, unitCustom));

  }



  function handleUnitCustomChange(custom: string) {

    setUnitCustom(custom);

    handleChange('unit', unitValueFromPreset(UNIT_OTHER, custom));

  }



  function handleSaveCategory() {

    const name = newCategoryName.trim();

    if (!name) {

      setCategoryAddError('أدخل اسم الفئة');

      return;

    }

    setCategoryAddError('');

    createCategoryMutation.mutate(name);

  }



  function handleSubmit(e: FormEvent) {

    e.preventDefault();

    const unit = unitValueFromPreset(unitPreset, unitCustom);

    if (!unit) {

      return;

    }

    onSubmit({ ...values, unit });

  }



  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">

      <div

        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"

        role="dialog"

        aria-modal="true"

        aria-labelledby="product-form-title"

      >

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

          <h2 id="product-form-title" className="text-lg font-bold text-slate-900">

            {mode === 'create' ? 'إضافة منتج' : 'تعديل منتج'}

          </h2>

          <button

            type="button"

            onClick={onClose}

            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"

            aria-label="إغلاق"

          >

            <X className="h-5 w-5" />

          </button>

        </div>



        <form onSubmit={handleSubmit} className="space-y-4 p-6">

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <Field label="SKU" required>

              <input

                value={values.sku}

                onChange={(e) => handleChange('sku', e.target.value)}

                placeholder="مثال: 5W-30 أو FILTER-001 أو (10W-40)"

                required

                className={inputClass}

              />

              <p className="mt-1 text-xs text-slate-500">

                اكتب درجة اللزوجة بين قوسين مثل (5W-30)

              </p>

            </Field>

            <Field label="الوحدة" required>

              <select

                value={unitPreset}

                onChange={(e) => handleUnitPresetChange(e.target.value)}

                required

                className={inputClass}

              >

                {UNIT_PRESETS.map((unit) => (

                  <option key={unit} value={unit}>

                    {unit}

                  </option>

                ))}

                <option value={UNIT_OTHER}>أخرى</option>

              </select>

              {unitPreset === UNIT_OTHER && (

                <input

                  value={unitCustom}

                  onChange={(e) => handleUnitCustomChange(e.target.value)}

                  placeholder="اكتب الوحدة..."

                  required

                  className={`${inputClass} mt-2`}

                />

              )}

            </Field>

          </div>



          <Field label="اسم المنتج" required>

            <input

              value={values.name}

              onChange={(e) => handleChange('name', e.target.value)}

              required

              className={inputClass}

            />

          </Field>



          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

            <Field label="سعر كلفة الكارتون" required>

              <input

                type="number"

                min="0.01"

                step="0.01"

                value={values.costPrice}

                onChange={(e) => handleChange('costPrice', e.target.value)}

                required

                className={inputClass}

              />
              {formatPieceCostPreview(values.costPrice, values.unitsPerCarton) && (
                <p className="mt-1 text-xs font-medium text-blue-700">
                  {formatPieceCostPreview(values.costPrice, values.unitsPerCarton)}
                </p>
              )}

            </Field>

            {product ? (
              <Field label="متوسط كلفة الكارتون">
                <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                  {formatProductAverageCost(product)}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  كلفة القطعة: {formatPrice(productUnitCost(product))} د.ع
                </p>
              </Field>
            ) : null}

            <Field label="سعر القطعة (مفرد)" required>

              <input

                type="number"

                min="0.01"

                step="0.01"

                value={values.retailPrice}

                onChange={(e) => handleChange('retailPrice', e.target.value)}

                required

                className={inputClass}

              />

            </Field>

            <Field label="سعر الكارتون الكامل" required>

              <input

                type="number"

                min="0.01"

                step="0.01"

                value={values.wholesalePrice}

                onChange={(e) => handleChange('wholesalePrice', e.target.value)}

                required

                className={inputClass}

              />

            </Field>

          </div>



          <Field label="عدد القطع بالكارتون" required>

            <input

              type="number"

              min="1"

              step="1"

              value={values.unitsPerCarton}

              onChange={(e) => handleChange('unitsPerCarton', e.target.value)}

              required

              className={inputClass}

            />

            <p className="mt-1 text-xs text-slate-500">كم قطعة يحتوي الكارتون الواحد؟</p>

          </Field>



          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <Field label="حد التنبيه للمخزون" required>

              <input

                type="number"

                min="0"

                step="1"

                value={values.minStockAlert}

                onChange={(e) => handleChange('minStockAlert', e.target.value)}

                required

                className={inputClass}

              />

            </Field>

            <Field label="الفئة" required>

              <div className="flex gap-2">

                <select

                  value={values.categoryId}

                  onChange={(e) => handleChange('categoryId', e.target.value)}

                  required

                  disabled={categoriesLoading}

                  className={inputClass}

                >

                  <option value="">

                    {categoriesLoading ? 'جاري تحميل الفئات...' : '— اختر الفئة —'}

                  </option>

                  {categories.map((cat) => (

                    <option key={cat.id} value={cat.id}>

                      {cat.name}

                    </option>

                  ))}

                </select>

                <button

                  type="button"

                  onClick={() => {

                    setShowAddCategory((prev) => !prev);

                    setCategoryAddError('');

                    setNewCategoryName('');

                  }}

                  disabled={categoriesLoading || createCategoryMutation.isPending}

                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60"

                  aria-label="إضافة فئة"

                  title="إضافة فئة"

                >

                  <Plus className="h-5 w-5" />

                </button>

              </div>

              {showAddCategory && (

                <div className="mt-2 flex gap-2">

                  <input

                    type="text"

                    value={newCategoryName}

                    onChange={(e) => setNewCategoryName(e.target.value)}

                    placeholder="اسم الفئة الجديدة"

                    className={inputClass}

                    disabled={createCategoryMutation.isPending}

                  />

                  <button

                    type="button"

                    onClick={handleSaveCategory}

                    disabled={createCategoryMutation.isPending}

                    className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"

                  >

                    {createCategoryMutation.isPending ? (

                      <Loader2 className="h-4 w-4 animate-spin" />

                    ) : (

                      'حفظ'

                    )}

                  </button>

                </div>

              )}

              {categoryAddError && (

                <p className="mt-1 text-xs text-red-600">{categoryAddError}</p>

              )}

            </Field>

          </div>



          {error && (

            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>

          )}



          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">

            <button

              type="button"

              onClick={onClose}

              disabled={saving}

              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"

            >

              إلغاء

            </button>

            <button

              type="submit"

              disabled={saving || createCategoryMutation.isPending}

              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"

            >

              {saving ? 'جاري الحفظ...' : 'حفظ'}

            </button>

          </div>

        </form>

      </div>

    </div>

  );

}



function Field({

  label,

  required,

  children,

}: {

  label: string;

  required?: boolean;

  children: ReactNode;

}) {

  return (

    <label className="block text-sm font-medium text-slate-700">

      {label}

      {required && <span className="text-red-500"> *</span>}

      <div className="mt-1">{children}</div>

    </label>

  );

}



const inputClass =

  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

