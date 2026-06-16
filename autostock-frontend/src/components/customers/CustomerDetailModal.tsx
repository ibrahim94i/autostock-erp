import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Loader2, Pencil, Printer, Wallet, X } from 'lucide-react';

import {

  balanceColorClass,

  fetchCustomerBalance,

  fetchCustomerStatement,

  formatDateTime,

  formatPrice,

  parseQuantity,

} from '../../api';

import { useSettings } from '../../context/SettingsContext';

import { printCustomerStatement, statementDescription } from '../../pos/customerStatementPrint';

import type { Customer } from '../../types';



interface CustomerDetailModalProps {

  customer: Customer | null;

  onClose: () => void;

  onPay: (customer: Customer, balance: number) => void;

  onEdit?: (customer: Customer) => void;

}



function customerTypeLabel(type: string): string {
  if (type === 'wholesale') return 'جملة';
  if (type === 'both') return 'تجزئة وجملة';
  return 'تجزئة';
}



export function CustomerDetailModal({ customer, onClose, onPay, onEdit }: CustomerDetailModalProps) {

  const { settings } = useSettings();

  const balanceQuery = useQuery({

    queryKey: ['customers', customer?.id, 'balance'],

    queryFn: () => fetchCustomerBalance(customer!.id),

    enabled: !!customer,

  });



  const statementQuery = useQuery({

    queryKey: ['customers', customer?.id, 'statement'],

    queryFn: () => fetchCustomerStatement(customer!.id),

    enabled: !!customer,

  });



  const statementWithBalance = useMemo(() => {

    const lines = statementQuery.data ?? [];

    let running = 0;



    return lines.map((line) => {

      const debit = parseQuantity(line.debit);

      const credit = parseQuantity(line.credit);

      running += debit - credit;

      return { ...line, debit, credit, running };

    });

  }, [statementQuery.data]);



  if (!customer) return null;



  const balance = balanceQuery.data ? parseQuantity(balanceQuery.data.balance) : 0;

  const balanceLoading = balanceQuery.isLoading;



  function handlePrintStatement() {
    if (!customer) return;

    printCustomerStatement({
      currency: settings.currency,
      customerName: customer.name,
      customerPhone: customer.phone || '—',
      customerType: customerTypeLabel(customer.type),
      periodLabel: 'كشف شامل لجميع الحركات',
      currentBalance: balance,
      lines: statementWithBalance.map((line) => ({
        entryDate: line.entryDate,
        description: statementDescription(line.debit, line.credit),
        debit: line.debit,
        credit: line.credit,
        running: line.running,
      })),
    });
  }



  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

          <h3 className="text-lg font-bold text-slate-900">كشف حساب العميل</h3>

          <button

            type="button"

            onClick={onClose}

            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"

          >

            <X className="h-5 w-5" />

          </button>

        </div>



        <div className="min-h-0 flex-1 space-y-5 overflow-auto p-6">

          <div className="grid gap-4 sm:grid-cols-3">

            <div>

              <p className="text-xs text-slate-500">الاسم</p>

              <p className="font-semibold text-slate-900">{customer.name}</p>

            </div>

            <div>

              <p className="text-xs text-slate-500">الهاتف</p>

              <p className="font-semibold text-slate-900">{customer.phone || '—'}</p>

            </div>

            <div>

              <p className="text-xs text-slate-500">النوع</p>

              <p className="font-semibold text-slate-900">{customerTypeLabel(customer.type)}</p>

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

                  <span className="ms-2 text-sm font-normal text-orange-600">(مستحق على العميل)</span>

                )}

              </p>

            )}

          </div>



          <div>

            <p className="mb-2 text-sm font-semibold text-slate-700">حركات الحساب</p>

            {statementQuery.isLoading && (

              <p className="text-sm text-slate-500">جاري التحميل...</p>

            )}

            {statementQuery.isError && (

              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">

                فشل تحميل كشف الحساب

              </p>

            )}

            {!statementQuery.isLoading && !statementQuery.isError && statementWithBalance.length === 0 && (

              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">

                لا توجد حركات لهذا العميل

              </p>

            )}

            {statementWithBalance.length > 0 && (

              <div className="overflow-x-auto rounded-xl border border-slate-200">

                <table className="w-full min-w-[480px] border-collapse text-sm">

                  <thead>

                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">

                      <th className="px-3 py-2 text-right font-semibold">التاريخ</th>

                      <th className="px-3 py-2 text-right font-semibold">مدين</th>

                      <th className="px-3 py-2 text-right font-semibold">دائن</th>

                      <th className="px-3 py-2 text-right font-semibold">الرصيد</th>

                    </tr>

                  </thead>

                  <tbody>

                    {statementWithBalance.map((line) => (

                      <tr key={line.entryId} className="border-b border-slate-100">

                        <td className="px-3 py-2 text-slate-600">

                          {formatDateTime(line.entryDate)}

                        </td>

                        <td className="px-3 py-2">

                          {line.debit > 0 ? formatPrice(line.debit) : '—'}

                        </td>

                        <td className="px-3 py-2">

                          {line.credit > 0 ? formatPrice(line.credit) : '—'}

                        </td>

                        <td className={`px-3 py-2 font-semibold ${balanceColorClass(line.running)}`}>

                          {formatPrice(line.running)}

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </div>



        <div className="flex flex-wrap gap-3 border-t border-slate-200 px-6 py-4">

          {onEdit && (

            <button

              type="button"

              onClick={() => onEdit(customer)}

              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-300 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"

            >

              <Pencil className="h-4 w-4" />

              تعديل البيانات

            </button>

          )}

          <button

            type="button"

            onClick={handlePrintStatement}

            disabled={statementQuery.isLoading}

            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"

          >

            <Printer className="h-4 w-4" />

            طباعة كشف الحساب

          </button>

          {balance > 0 && !balanceLoading && (

            <button

              type="button"

              onClick={() => onPay(customer, balance)}

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

