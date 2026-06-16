import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Loader2, X, FileUp } from 'lucide-react';
import {
  createProduct,
  deleteProduct,
  fetchCategories,
  fetchProducts,
  formatPrice,
  formValuesToCreatePayload,
  formValuesToUpdatePayload,
  isAdmin,
  updateCategory,
  updateProduct,
} from '../api';
import { ProductFormModal } from '../components/products/ProductFormModal';
import { ProductImportModal } from '../components/products/ProductImportModal';
import type { Category, Product, ProductFormValues } from '../types';

const PAGE_SIZE = 10;

function mapProductSaveError(message: string): string {
  if (message === 'An unexpected error occurred') {
    return 'فشل الحفظ: SKU مكرر أو الفئة غير صالحة';
  }
  return message;
}

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const adminUser = isAdmin();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(''), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const productsQuery = useQuery({
    queryKey: ['products', { search: debouncedSearch, page, limit: PAGE_SIZE }],
    queryFn: () =>
      fetchProducts({
        search: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const createMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const categories = categoriesQuery.data ?? [];
      if (!values.categoryId.trim()) {
        throw new Error('يرجى اختيار الفئة');
      }
      if (!categories.some((category) => category.id === values.categoryId)) {
        throw new Error('الفئة المختارة غير موجودة، اختر فئة أخرى');
      }

      const payload = formValuesToCreatePayload(values);
      return createProduct(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      setModalOpen(false);
      setFormError('');
      setSuccessMessage('تم إضافة المنتج بنجاح');
    },
    onError: (err: Error) => setFormError(mapProductSaveError(err.message)),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ProductFormValues }) => {
      const payload = formValuesToUpdatePayload(values);
      return updateProduct(id, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      setModalOpen(false);
      setEditingProduct(null);
      setFormError('');
      setSuccessMessage('تم تحديث المنتج بنجاح');
    },
    onError: (err: Error) => setFormError(mapProductSaveError(err.message)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteTarget(null);
      setSuccessMessage('تم الحذف');
    },
    onError: (err: Error) => {
      setDeleteTarget(null);
      setSuccessMessage('');
      window.alert(err.message);
    },
  });

  const categoryUpdateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateCategory(id, { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingCategory(null);
      setCategoryNameInput('');
      setCategoryError('');
      setSuccessMessage('تم تحديث الفئة بنجاح');
    },
    onError: (err: Error) => setCategoryError(err.message),
  });

  const saving = createMutation.isPending || updateMutation.isPending;
  const { data, isLoading, isError, error } = productsQuery;
  const products = data?.items ?? [];

  function openCreateModal() {
    setModalMode('create');
    setEditingProduct(null);
    setFormError('');
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setModalMode('edit');
    setEditingProduct(product);
    setFormError('');
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingProduct(null);
    setFormError('');
  }

  function handleFormSubmit(values: ProductFormValues) {
    setFormError('');

    if (modalMode === 'create') {
      createMutation.mutate(values);
      return;
    }

    if (!editingProduct) return;
    updateMutation.mutate({
      id: editingProduct.id,
      values,
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  }

  function openCategoryEdit(category: Category) {
    setEditingCategory(category);
    setCategoryNameInput(category.name);
    setCategoryError('');
  }

  function closeCategoryEdit() {
    if (categoryUpdateMutation.isPending) return;
    setEditingCategory(null);
    setCategoryNameInput('');
    setCategoryError('');
  }

  const categories = categoriesQuery.data ?? [];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">المنتجات</h2>
          <p className="mt-1 text-sm text-slate-500">إدارة وعرض المنتجات المسجّلة</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {adminUser && (
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <FileUp className="h-4 w-4" />
              استيراد Excel
            </button>
          )}
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            إضافة منتج
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      {categories.length > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-slate-700">فئات المنتجات</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm"
              >
                <span>{category.name}</span>
                <button
                  type="button"
                  onClick={() => openCategoryEdit(category)}
                  className="rounded p-1 text-slate-500 hover:bg-white hover:text-blue-600"
                  title="تعديل الفئة"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="بحث بالاسم أو SKU..."
            className="w-full rounded-lg border border-slate-300 py-2.5 pr-10 pl-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {isLoading && (
        <p className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          جاري التحميل...
        </p>
      )}

      {isError && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error instanceof Error ? error.message : 'فشل تحميل المنتجات'}
        </p>
      )}

      {!isLoading && !isError && products.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          لا توجد منتجات
          {debouncedSearch ? ` مطابقة لـ "${debouncedSearch}"` : ''}
        </p>
      )}

      {!isLoading && !isError && products.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-4 py-3 text-right font-semibold">SKU</th>
                  <th className="px-4 py-3 text-right font-semibold">الاسم</th>
                  <th className="px-4 py-3 text-right font-semibold">كلفة الكارتون</th>
                  <th className="px-4 py-3 text-right font-semibold">التجزئة</th>
                  <th className="px-4 py-3 text-right font-semibold">الجملة</th>
                  <th className="px-4 py-3 text-right font-semibold">الوحدة</th>
                  <th className="px-4 py-3 text-right font-semibold">تنبيه</th>
                  <th className="px-4 py-3 text-right font-semibold">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">{formatPrice(p.costPrice)}</td>
                    <td className="px-4 py-3">{formatPrice(p.retailPrice)}</td>
                    <td className="px-4 py-3">{formatPrice(p.wholesalePrice)}</td>
                    <td className="px-4 py-3">{p.unit}</td>
                    <td className="px-4 py-3">{p.minStockAlert}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          تعديل
                        </button>
                        {adminUser && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            حذف
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
              <p className="text-slate-600">
                صفحة {data.page} من {data.totalPages} — إجمالي {data.total} منتج
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
                  disabled={page >= data.totalPages}
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

      <ProductFormModal
        open={modalOpen}
        mode={modalMode}
        product={editingProduct}
        categories={categoriesQuery.data ?? []}
        categoriesLoading={categoriesQuery.isLoading}
        saving={saving}
        error={formError}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
          >
            <h3 id="delete-product-title" className="text-lg font-bold text-slate-900">
              حذف المنتج
            </h3>
            <p className="mt-3 text-sm text-slate-600">
              هل تريد حذف هذا المنتج؟ لا يمكن التراجع.
            </p>
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
              {deleteTarget.name}{' '}
              <span className="font-mono text-xs text-slate-500">({deleteTarget.sku})</span>
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMutation.isPending}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">تعديل الفئة</h3>
              <button
                type="button"
                onClick={closeCategoryEdit}
                disabled={categoryUpdateMutation.isPending}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const name = categoryNameInput.trim();
                if (!name) {
                  setCategoryError('أدخل اسم الفئة');
                  return;
                }
                categoryUpdateMutation.mutate({ id: editingCategory.id, name });
              }}
              className="space-y-4 p-6"
            >
              <label className="block text-sm font-medium text-slate-700">
                اسم الفئة
                <input
                  type="text"
                  value={categoryNameInput}
                  onChange={(e) => setCategoryNameInput(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                />
              </label>
              {categoryError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{categoryError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeCategoryEdit}
                  disabled={categoryUpdateMutation.isPending}
                  className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={categoryUpdateMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {categoryUpdateMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ProductImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={({ imported, skipped }) => {
          void queryClient.invalidateQueries({ queryKey: ['products'] });
          void queryClient.invalidateQueries({ queryKey: ['categories'] });
          setSuccessMessage(
            `تم استيراد ${imported} منتج${skipped > 0 ? ` (تخطي ${skipped} مكرر)` : ''}`,
          );
        }}
      />
    </div>
  );
}
