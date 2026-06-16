import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileDown, Loader2, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import {
  createExpense,
  createExpenseCategory,
  deleteExpense,
  fetchExpenseCategories,
  fetchExpenses,
  formatDateTime,
  formatPrice,
  isAdmin,
  parseQuantity,
  UnauthorizedError,
  updateExpense,
} from '../api';
import type { Expense } from '../types';
import { exportToExcel } from '../utils/exportExcel';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIsoDate(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function formatExpenseDate(date: string): string {
  return formatDateTime(date).split(' ')[0] ?? date.slice(0, 10);
}

interface CreateExpenseModalProps {
  open: boolean;
  expense?: Expense | null;
  categories: { id: string; name: string }[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateExpenseModal({
  open,
  expense,
  categories,
  saving,
  error,
  onClose,
  onSuccess,
}: CreateExpenseModalProps) {
  const isEdit = !!expense;
  const queryClient = useQueryClient();
  const admin = isAdmin();
  const [date, setDate] = useState(todayIsoDate());
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setDate(expense.date.slice(0, 10));
      setAmount(String(parseQuantity(expense.amount)));
      setCategoryId(expense.categoryId);
      setDescription(expense.description ?? '');
    } else {
      setDate(todayIsoDate());
      setAmount('');
      setCategoryId(categories[0]?.id ?? '');
      setDescription('');
    }
    setShowAddCategory(false);
    setNewCategoryName('');
    setCategoryError('');
  }, [open, expense, categories]);

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => createExpenseCategory({ name: name.trim() }),
    onSuccess: async (category) => {
      await queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      setCategoryId(category.id);
      setShowAddCategory(false);
      setNewCategoryName('');
      setCategoryError('');
    },
    onError: (err: Error) => setCategoryError(err.message),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const parsedAmount = parseFloat(amount);
      if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('المبلغ غير صالح');
      }
      if (!categoryId) {
        throw new Error('اختر فئة المصروف');
      }
      if (isEdit && expense) {
        return updateExpense(expense.id, {
          date,
          amount: parsedAmount,
          categoryId,
          description: description.trim() || undefined,
        });
      }
      return createExpense({
        date,
        amount: parsedAmount,
        categoryId,
        description: description.trim() || undefined,
        clientUuid: crypto.randomUUID(),
      });
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">
            {isEdit ? 'تعديل مصروف' : 'تسجيل مصروف'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <label className="block text-sm font-medium text-slate-700">
            التاريخ
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            المبلغ
            <input
              type="number"
              min={0.01}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            الفئة
            <div className="mt-1 flex gap-2">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
              >
                <option value="">— اختر الفئة —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {admin && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategory((v) => !v);
                    setCategoryError('');
                  }}
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-slate-300 hover:bg-slate-50"
                  title="إضافة فئة"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </div>
            {showAddCategory && admin && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="اسم الفئة الجديدة"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const name = newCategoryName.trim();
                    if (!name) {
                      setCategoryError('أدخل اسم الفئة');
                      return;
                    }
                    createCategoryMutation.mutate(name);
                  }}
                  disabled={createCategoryMutation.isPending}
                  className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  حفظ
                </button>
              </div>
            )}
            {categoryError && <p className="mt-1 text-xs text-red-600">{categoryError}</p>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            الوصف (اختياري)
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
            />
          </label>

          {(error || createMutation.error) && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error || (createMutation.error instanceof Error ? createMutation.error.message : '')}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || createMutation.isPending}
              className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving || createMutation.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {(saving || createMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ExpensesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [from, setFrom] = useState(monthStartIsoDate());
  const [to, setTo] = useState(todayIsoDate());
  const [categoryFilter, setCategoryFilter] = useState('');
  const [applied, setApplied] = useState({ from: monthStartIsoDate(), to: todayIsoDate(), categoryId: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formError, setFormError] = useState('');

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (err: Error) => window.alert(err.message),
  });

  useEffect(() => {
    document.title = 'المصاريف — AutoStock ERP';
  }, []);

  const categoriesQuery = useQuery({
    queryKey: ['expense-categories'],
    queryFn: fetchExpenseCategories,
  });

  const expensesQuery = useQuery({
    queryKey: ['expenses', applied],
    queryFn: () =>
      fetchExpenses({
        from: applied.from || undefined,
        to: applied.to || undefined,
        categoryId: applied.categoryId || undefined,
      }),
  });

  useEffect(() => {
    for (const err of [categoriesQuery.error, expensesQuery.error]) {
      if (err instanceof UnauthorizedError) {
        navigate('/login', { replace: true, state: { message: err.message } });
      }
    }
  }, [categoriesQuery.error, expensesQuery.error, navigate]);

  const categories = categoriesQuery.data ?? [];
  const items = expensesQuery.data?.items ?? [];
  const total = parseQuantity(expensesQuery.data?.total ?? 0);

  const exportRows = useMemo(
    () =>
      items.map((item) => [
        formatExpenseDate(item.date),
        item.category.name,
        item.description ?? '',
        parseQuantity(item.amount),
      ]),
    [items],
  );

  function applyFilters() {
    setApplied({ from, to, categoryId: categoryFilter });
  }

  function handleExport() {
    exportToExcel(
      `مصاريف-${applied.from}_${applied.to}.xlsx`,
      'المصاريف',
      ['التاريخ', 'الفئة', 'الوصف', 'المبلغ'],
      exportRows,
      [14, 16, 28, 14],
    );
  }

  async function handleExpenseSaved() {
    await queryClient.invalidateQueries({ queryKey: ['expenses'] });
    await queryClient.invalidateQueries({ queryKey: ['cash'] });
    setModalOpen(false);
    setEditingExpense(null);
    setFormError('');
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">المصاريف والنفقات</h2>
          <p className="mt-1 text-sm text-slate-500">تسجيل ومتابعة مصاريف التشغيل</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={items.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            تصدير Excel
          </button>
          <button
            type="button"
            onClick={() => {
              setFormError('');
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            تسجيل مصروف
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <label className="text-sm font-medium text-slate-700">
          من
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          إلى
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          الفئة
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mt-1 block min-w-[160px] rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">الكل</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={applyFilters}
          className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900"
        >
          تطبيق
        </button>
      </div>

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-center gap-2 text-amber-900">
          <Receipt className="h-5 w-5" />
          <span className="text-sm font-medium">إجمالي المصاريف للفترة:</span>
          <span className="text-lg font-bold">{formatPrice(total)}</span>
        </div>
      </div>

      {expensesQuery.isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          جاري التحميل...
        </div>
      )}

      {expensesQuery.isError && !(expensesQuery.error instanceof UnauthorizedError) && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {expensesQuery.error instanceof Error
            ? expensesQuery.error.message
            : 'فشل تحميل المصاريف'}
        </p>
      )}

      {!expensesQuery.isLoading && !expensesQuery.isError && items.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          لا توجد مصاريف في هذه الفترة
        </p>
      )}

      {!expensesQuery.isLoading && !expensesQuery.isError && items.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-4 py-3 text-right font-semibold">التاريخ</th>
                <th className="px-4 py-3 text-right font-semibold">الفئة</th>
                <th className="px-4 py-3 text-right font-semibold">الوصف</th>
                <th className="px-4 py-3 text-right font-semibold">المبلغ</th>
                <th className="px-4 py-3 text-right font-semibold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-4 py-3">{formatExpenseDate(item.date)}</td>
                  <td className="px-4 py-3 font-medium">{item.category.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.description ?? '—'}</td>
                  <td className="px-4 py-3 font-bold text-red-700">
                    {formatPrice(parseQuantity(item.amount))}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFormError('');
                        setEditingExpense(item);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('حذف هذا المصروف؟')) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                      className="ms-1 inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateExpenseModal
        open={modalOpen}
        categories={categories}
        saving={false}
        error={formError}
        onClose={() => setModalOpen(false)}
        onSuccess={() => void handleExpenseSaved()}
      />

      <CreateExpenseModal
        open={!!editingExpense}
        expense={editingExpense}
        categories={categories}
        saving={false}
        error={formError}
        onClose={() => {
          setEditingExpense(null);
          setFormError('');
        }}
        onSuccess={() => void handleExpenseSaved()}
      />
    </div>
  );
}
