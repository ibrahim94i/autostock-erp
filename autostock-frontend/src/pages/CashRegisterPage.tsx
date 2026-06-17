import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  Lock,
  Unlock,
  Wallet,
} from 'lucide-react';
import {
  cashTransactionTypeLabel,
  closeCashRegister,
  fetchCashToday,
  formatDateTime,
  formatPrice,
  isCashOutflowTransaction,
  openCashRegister,
  parseQuantity,
  UnauthorizedError,
} from '../api';
import type { CashRegister, CashRegisterSummary } from '../types';

function parseAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'string' ? parseFloat(value) || 0 : value;
}

function SummaryCards({ summary }: { summary: CashRegisterSummary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 text-emerald-700">
          <ArrowDownCircle className="h-5 w-5" />
          <p className="text-sm font-medium">إجمالي الداخل</p>
        </div>
        <p className="mt-2 text-2xl font-bold text-emerald-900">
          {formatPrice(parseAmount(summary.totalIn))}
        </p>
      </div>
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-red-700">
          <ArrowUpCircle className="h-5 w-5" />
          <p className="text-sm font-medium">إجمالي الخارج</p>
        </div>
        <p className="mt-2 text-2xl font-bold text-red-900">
          {formatPrice(parseAmount(summary.totalOut))}
        </p>
      </div>
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center gap-2 text-blue-700">
          <Wallet className="h-5 w-5" />
          <p className="text-sm font-medium">الرصيد المتوقع</p>
        </div>
        <p className="mt-2 text-2xl font-bold text-blue-900">
          {formatPrice(parseAmount(summary.expectedBalance))}
        </p>
      </div>
    </div>
  );
}

function ClosedSummary({ register }: { register: CashRegister }) {
  const diff = parseAmount(register.difference);
  const isOver = diff > 0;
  const isShort = diff < 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-slate-700">
          <Lock className="h-5 w-5" />
          <h3 className="text-lg font-bold">ملخص يوم {formatDateTime(register.date).split(' ')[0]}</h3>
        </div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">الرصيد الافتتاحي</dt>
            <dd className="text-lg font-semibold">{formatPrice(parseAmount(register.openingBalance))}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">الرصيد المتوقع (إغلاق)</dt>
            <dd className="text-lg font-semibold">{formatPrice(parseAmount(register.closingBalance))}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">الرصيد الفعلي</dt>
            <dd className="text-lg font-semibold">{formatPrice(parseAmount(register.actualBalance))}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">الفرق</dt>
            <dd
              className={[
                'text-lg font-bold',
                isOver ? 'text-emerald-700' : isShort ? 'text-red-700' : 'text-slate-900',
              ].join(' ')}
            >
              {formatPrice(diff)}{' '}
              {isOver ? '(زيادة)' : isShort ? '(نقص)' : '(متطابق)'}
            </dd>
          </div>
        </dl>
        {register.notes && (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            ملاحظات: {register.notes}
          </p>
        )}
      </div>
    </div>
  );
}

export function CashRegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openingBalance, setOpeningBalance] = useState('');
  const [actualBalance, setActualBalance] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [showNewOpenForm, setShowNewOpenForm] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    document.title = 'الصندوق — AutoStock ERP';
  }, []);

  const todayQuery = useQuery({
    queryKey: ['cash', 'today'],
    queryFn: fetchCashToday,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (todayQuery.error instanceof UnauthorizedError) {
      navigate('/login', { replace: true, state: { message: todayQuery.error.message } });
    }
  }, [todayQuery.error, navigate]);

  const openMutation = useMutation({
    mutationFn: () => {
      const balance = parseFloat(openingBalance);
      if (Number.isNaN(balance) || balance < 0) {
        throw new Error('أدخل رصيد افتتاحي صالح');
      }
      return openCashRegister({ openingBalance: balance });
    },
    onSuccess: async () => {
      setFormError('');
      setOpeningBalance('');
      setShowNewOpenForm(false);
      await queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const closeMutation = useMutation({
    mutationFn: () => {
      const balance = parseFloat(actualBalance);
      if (Number.isNaN(balance) || balance < 0) {
        throw new Error('أدخل الرصيد الفعلي');
      }
      return closeCashRegister({
        actualBalance: balance,
        notes: closeNotes.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setFormError('');
      setShowCloseForm(false);
      setActualBalance('');
      setCloseNotes('');
      await queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const register = todayQuery.data?.register ?? null;
  const summary = todayQuery.data?.summary ?? null;
  const isOpen = register?.status === 'open';
  const isClosed = register?.status === 'closed';

  function handleOpenSubmit(e: FormEvent) {
    e.preventDefault();
    openMutation.mutate();
  }

  function handleCloseSubmit(e: FormEvent) {
    e.preventDefault();
    closeMutation.mutate();
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">الصندوق (القاصة)</h2>
        <p className="mt-1 text-sm text-slate-500">إدارة الرصيد النقدي اليومي والتسوية</p>
      </div>

      {todayQuery.isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          جاري التحميل...
        </div>
      )}

      {todayQuery.isError && !(todayQuery.error instanceof UnauthorizedError) && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {todayQuery.error instanceof Error ? todayQuery.error.message : 'فشل تحميل الصندوق'}
        </p>
      )}

      {!todayQuery.isLoading && !todayQuery.isError && !register && (
        <div className="mx-auto max-w-md rounded-xl border border-dashed border-slate-300 bg-white p-8 shadow-sm">
          <div className="mb-4 flex items-center justify-center">
            <Unlock className="h-12 w-12 text-blue-600" />
          </div>
          <h3 className="text-center text-lg font-bold text-slate-900">فتح الصندوق</h3>
          <p className="mt-2 text-center text-sm text-slate-500">
            لا يوجد صندوق مفتوح لهذا اليوم — أدخل الرصيد الافتتاحي للبدء
          </p>
          <form onSubmit={handleOpenSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              الرصيد الافتتاحي
              <input
                type="number"
                min={0}
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                required
                placeholder="0.00"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>
            {formError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
            )}
            <button
              type="submit"
              disabled={openMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {openMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الفتح...
                </>
              ) : (
                'فتح الصندوق'
              )}
            </button>
          </form>
        </div>
      )}

      {!todayQuery.isLoading && register && isOpen && summary && (
        <div className="space-y-6">
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            الصندوق مفتوح — الرصيد الافتتاحي:{' '}
            <span className="font-bold">{formatPrice(parseAmount(register.openingBalance))}</span>
          </div>

          <SummaryCards summary={summary} />

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="font-bold text-slate-900">معاملات اليوم</h3>
            </div>
            {(register.transactions?.length ?? 0) === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">لا توجد معاملات بعد</p>
            ) : (
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-4 py-3 text-right font-semibold">النوع</th>
                    <th className="px-4 py-3 text-right font-semibold">الوصف</th>
                    <th className="px-4 py-3 text-right font-semibold">المبلغ</th>
                    <th className="px-4 py-3 text-right font-semibold">الوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {register.transactions!.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-100">
                      <td className="px-4 py-3">{cashTransactionTypeLabel(tx.type)}</td>
                      <td className="px-4 py-3 text-slate-600">{tx.description ?? '—'}</td>
                      <td
                        className={[
                          'px-4 py-3 font-semibold',
                          isCashOutflowTransaction(tx.type) ? 'text-red-700' : 'text-emerald-700',
                        ].join(' ')}
                      >
                        {isCashOutflowTransaction(tx.type) ? '−' : '+'}
                        {formatPrice(parseQuantity(tx.amount))}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDateTime(tx.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!showCloseForm ? (
            <button
              type="button"
              onClick={() => {
                setFormError('');
                setShowCloseForm(true);
                if (summary) {
                  setActualBalance(String(parseAmount(summary.expectedBalance)));
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900"
            >
              <Lock className="h-4 w-4" />
              إغلاق الصندوق
            </button>
          ) : (
            <form
              onSubmit={handleCloseSubmit}
              className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-bold text-slate-900">إغلاق الصندوق</h3>
              <label className="block text-sm font-medium text-slate-700">
                الرصيد الفعلي في الدرج
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={actualBalance}
                  onChange={(e) => setActualBalance(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                ملاحظات (اختياري)
                <textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                />
              </label>
              {formError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCloseForm(false)}
                  disabled={closeMutation.isPending}
                  className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={closeMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
                >
                  {closeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'تأكيد الإغلاق'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {!todayQuery.isLoading && register && isClosed && (
        <div className="space-y-6">
          <ClosedSummary register={register} />
          {summary && <SummaryCards summary={summary} />}
          {(register.transactions?.length ?? 0) > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="font-bold text-slate-900">معاملات اليوم</h3>
              </div>
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-4 py-3 text-right font-semibold">النوع</th>
                    <th className="px-4 py-3 text-right font-semibold">الوصف</th>
                    <th className="px-4 py-3 text-right font-semibold">المبلغ</th>
                    <th className="px-4 py-3 text-right font-semibold">الوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {register.transactions!.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-100">
                      <td className="px-4 py-3">{cashTransactionTypeLabel(tx.type)}</td>
                      <td className="px-4 py-3 text-slate-600">{tx.description ?? '—'}</td>
                      <td
                        className={[
                          'px-4 py-3 font-semibold',
                          isCashOutflowTransaction(tx.type) ? 'text-red-700' : 'text-emerald-700',
                        ].join(' ')}
                      >
                        {isCashOutflowTransaction(tx.type) ? '−' : '+'}
                        {formatPrice(parseQuantity(tx.amount))}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{formatDateTime(tx.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!showNewOpenForm ? (
            <button
              type="button"
              onClick={() => {
                setFormError('');
                setShowNewOpenForm(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Unlock className="h-4 w-4" />
              فتح صندوق جديد
            </button>
          ) : (
            <div className="mx-auto max-w-md rounded-xl border border-dashed border-slate-300 bg-white p-8 shadow-sm">
              <h3 className="text-center text-lg font-bold text-slate-900">فتح صندوق جديد</h3>
              <p className="mt-2 text-center text-sm text-slate-500">
                أدخل الرصيد الافتتاحي لبدء وردية جديدة
              </p>
              <form onSubmit={handleOpenSubmit} className="mt-6 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  الرصيد الافتتاحي
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    required
                    placeholder="0.00"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>
                {formError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowNewOpenForm(false)}
                    disabled={openMutation.isPending}
                    className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={openMutation.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {openMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جاري الفتح...
                      </>
                    ) : (
                      'فتح الصندوق'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
