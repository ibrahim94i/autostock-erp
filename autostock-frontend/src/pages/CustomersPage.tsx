import { useEffect, useMemo, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { Plus, Search, Pencil, Trash2 } from 'lucide-react';

import {

  balanceColorClass,

  createCustomer,

  createPayment,

  fetchCustomerBalance,

  fetchCustomers,

  formatPrice,

  parseQuantity,

  UnauthorizedError,

  updateCustomer,

  deleteCustomer,

} from '../api';

import {

  CreateCustomerModal,

  type CreateCustomerFormValues,

} from '../components/customers/CreateCustomerModal';

import { CustomerDetailModal } from '../components/customers/CustomerDetailModal';

import { CustomerPaymentModal } from '../components/customers/CustomerPaymentModal';

import type { Customer } from '../types';



const PAGE_SIZE = 20;



function newClientUuid(): string {

  return crypto.randomUUID();

}



function customerTypeLabel(type: string): string {
  if (type === 'wholesale') return 'جملة';
  if (type === 'both') return 'تجزئة وجملة';
  return 'تجزئة';
}



export function CustomersPage() {

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const paymentUuidRef = useRef(newClientUuid());



  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState('');

  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [successMessage, setSuccessMessage] = useState('');

  const [createOpen, setCreateOpen] = useState(false);

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [createError, setCreateError] = useState('');

  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  const [payTarget, setPayTarget] = useState<{ customer: Customer; balance: number } | null>(null);

  const [payError, setPayError] = useState('');



  useEffect(() => {

    document.title = 'العملاء — AutoStock ERP';

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



  const customersQuery = useQuery({

    queryKey: ['customers', { search: debouncedSearch, page, limit: PAGE_SIZE }],

    queryFn: () =>

      fetchCustomers({

        search: debouncedSearch || undefined,

        page,

        limit: PAGE_SIZE,

      }),

  });



  const customerItems = customersQuery.data?.items ?? [];



  const balanceQueries = useQueries({

    queries: customerItems.map((customer) => ({

      queryKey: ['customers', customer.id, 'balance'],

      queryFn: () => fetchCustomerBalance(customer.id),

      enabled: customerItems.length > 0,

    })),

  });



  const balanceByCustomerId = useMemo(() => {

    const map = new Map<string, number>();

    for (const query of balanceQueries) {

      if (query.data) {

        map.set(query.data.customerId, parseQuantity(query.data.balance));

      }

    }

    return map;

  }, [balanceQueries]);



  useEffect(() => {

    if (customersQuery.error instanceof UnauthorizedError) {

      navigate('/login', { replace: true, state: { message: customersQuery.error.message } });

    }

  }, [customersQuery.error, navigate]);



  const createMutation = useMutation({

    mutationFn: (values: CreateCustomerFormValues) =>

      createCustomer({

        name: values.name.trim(),

        type: values.type,

        ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),

      }),

    onSuccess: () => {

      void queryClient.invalidateQueries({ queryKey: ['customers'] });

      setCreateOpen(false);

      setCreateError('');

      setSuccessMessage('تم إضافة العميل بنجاح');

    },

    onError: (err: Error) => setCreateError(err.message),

  });



  const updateMutation = useMutation({

    mutationFn: ({ id, values }: { id: string; values: CreateCustomerFormValues }) =>

      updateCustomer(id, {

        name: values.name.trim(),

        type: values.type,

        ...(values.phone.trim() ? { phone: values.phone.trim() } : { phone: '' }),

      }),

    onSuccess: () => {

      void queryClient.invalidateQueries({ queryKey: ['customers'] });

      setEditingCustomer(null);

      setDetailCustomer(null);

      setCreateError('');

      setSuccessMessage('تم تحديث بيانات العميل بنجاح');

    },

    onError: (err: Error) => setCreateError(err.message),

  });



  const deleteMutation = useMutation({

    mutationFn: (id: string) => deleteCustomer(id),

    onSuccess: () => {

      void queryClient.invalidateQueries({ queryKey: ['customers'] });

      setDetailCustomer(null);

      setSuccessMessage('تم حذف العميل');

    },

    onError: (err: Error) => window.alert(err.message),

  });



  const payMutation = useMutation({

    mutationFn: async ({ customer, amount }: { customer: Customer; amount: number }) => {

      if (Number.isNaN(amount) || amount <= 0) {

        throw new Error('مبلغ الدفعة غير صالح');

      }



      const result = await createPayment(

        {

          partyType: 'CUSTOMER',

          partyId: customer.id,

          amount,

          direction: 'IN',

          method: 'cash',

        },

        paymentUuidRef.current,

      );



      if (result.status === 'REJECTED') {

        throw new Error(result.reason);

      }



      return customer;

    },

    onSuccess: (customer) => {

      void queryClient.invalidateQueries({ queryKey: ['customers'] });

      void queryClient.invalidateQueries({ queryKey: ['customers', customer.id, 'balance'] });

      void queryClient.invalidateQueries({ queryKey: ['customers', customer.id, 'statement'] });

      paymentUuidRef.current = newClientUuid();

      setPayTarget(null);

      setPayError('');

      setDetailCustomer(null);

      setSuccessMessage('تم تسجيل الدفعة بنجاح');

    },

    onError: (err: Error) => setPayError(err.message),

  });



  function openPay(customer: Customer, balance: number) {

    paymentUuidRef.current = newClientUuid();

    setPayError('');

    setPayTarget({ customer, balance });

  }



  const balancesLoading = balanceQueries.some((q) => q.isLoading);



  return (

    <div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <h2 className="text-xl font-bold text-slate-900">العملاء</h2>

          <p className="mt-1 text-sm text-slate-500">إدارة العملاء وأرصدتهم</p>

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

          عميل جديد

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



      {customersQuery.isLoading && (

        <p className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">

          جاري التحميل...

        </p>

      )}



      {customersQuery.isError && !(customersQuery.error instanceof UnauthorizedError) && (

        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">

          {customersQuery.error instanceof Error

            ? customersQuery.error.message

            : 'فشل تحميل العملاء'}

        </p>

      )}



      {!customersQuery.isLoading && !customersQuery.isError && customerItems.length === 0 && (

        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">

          لا يوجد عملاء

          {debouncedSearch ? ` مطابقون لـ "${debouncedSearch}"` : ''}

        </p>

      )}



      {!customersQuery.isLoading && !customersQuery.isError && customerItems.length > 0 && (

        <>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">

            <table className="w-full min-w-[700px] border-collapse text-sm">

              <thead>

                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">

                  <th className="px-4 py-3 text-right font-semibold">الاسم</th>

                  <th className="px-4 py-3 text-right font-semibold">الهاتف</th>

                  <th className="px-4 py-3 text-right font-semibold">النوع</th>

                  <th className="px-4 py-3 text-right font-semibold">الرصيد</th>

                  <th className="px-4 py-3 text-right font-semibold">إجراءات</th>

                </tr>

              </thead>

              <tbody>

                {customerItems.map((customer) => {

                  const balance = balanceByCustomerId.get(customer.id);

                  return (

                    <tr

                      key={customer.id}

                      onClick={() => setDetailCustomer(customer)}

                      className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"

                    >

                      <td className="px-4 py-3 font-medium text-slate-900">{customer.name}</td>

                      <td className="px-4 py-3 text-slate-600">{customer.phone || '—'}</td>

                      <td className="px-4 py-3 text-slate-600">{customerTypeLabel(customer.type)}</td>

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

                            setEditingCustomer(customer);

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

                            if (window.confirm(`حذف العميل "${customer.name}"؟`)) {

                              deleteMutation.mutate(customer.id);

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



          {customersQuery.data && customersQuery.data.totalPages > 1 && (

            <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">

              <p className="text-slate-600">

                صفحة {customersQuery.data.page} من {customersQuery.data.totalPages} — إجمالي{' '}

                {customersQuery.data.total} عميل

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

                  disabled={page >= customersQuery.data.totalPages}

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



      <CreateCustomerModal

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



      <CreateCustomerModal

        open={!!editingCustomer}

        customer={editingCustomer}

        saving={updateMutation.isPending}

        error={createError}

        onClose={() => {

          if (updateMutation.isPending) return;

          setEditingCustomer(null);

          setCreateError('');

        }}

        onSubmit={(values) => {

          if (!editingCustomer) return;

          updateMutation.mutate({ id: editingCustomer.id, values });

        }}

      />



      <CustomerDetailModal

        customer={detailCustomer}

        onClose={() => setDetailCustomer(null)}

        onPay={openPay}

        onEdit={(customer) => {

          setCreateError('');

          setEditingCustomer(customer);

        }}

      />



      <CustomerPaymentModal

        open={!!payTarget}

        customerName={payTarget?.customer.name ?? ''}

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

          payMutation.mutate({ customer: payTarget.customer, amount });

        }}

      />

    </div>

  );

}

