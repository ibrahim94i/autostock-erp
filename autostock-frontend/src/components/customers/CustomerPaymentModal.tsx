import { useEffect, useState, type FormEvent } from 'react';

import { Loader2, X } from 'lucide-react';

import { balanceColorClass, formatPrice } from '../../api';



interface CustomerPaymentModalProps {

  open: boolean;

  customerName: string;

  balance: number;

  saving: boolean;

  error: string;

  onClose: () => void;

  onSubmit: (amount: number) => void;

}



export function CustomerPaymentModal({

  open,

  customerName,

  balance,

  saving,

  error,

  onClose,

  onSubmit,

}: CustomerPaymentModalProps) {

  const [amount, setAmount] = useState('');



  useEffect(() => {

    if (!open) return;

    setAmount('');

  }, [open]);



  if (!open) return null;



  function handleSubmit(e: FormEvent) {

    e.preventDefault();

    onSubmit(parseFloat(amount));

  }



  return (

    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">

      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">

          <div>

            <h3 className="text-lg font-bold text-slate-900">تسجيل دفعة</h3>

            <p className="mt-0.5 text-sm text-slate-500">{customerName}</p>

          </div>

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

          <div className="rounded-xl bg-orange-50 px-4 py-3">

            <p className="text-xs text-orange-700">الرصيد الحالي (مستحق على العميل)</p>

            <p className={`text-2xl ${balanceColorClass(balance)}`}>

              {formatPrice(balance)} د.ع

            </p>

          </div>



          <label className="block text-sm font-medium text-slate-700">

            مبلغ الدفعة (مطلوب)

            <input

              type="number"

              min={0.01}

              step="any"

              value={amount}

              onChange={(e) => setAmount(e.target.value)}

              required

              placeholder="أدخل المبلغ..."

              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"

            />

          </label>



          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">

            طريقة الدفع: <span className="font-semibold text-slate-900">نقد (cash)</span>

          </div>



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

              disabled={saving}

              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"

            >

              {saving ? (

                <>

                  <Loader2 className="h-4 w-4 animate-spin" />

                  جاري التسجيل...

                </>

              ) : (

                'تسجيل الدفعة'

              )}

            </button>

          </div>

        </form>

      </div>

    </div>

  );

}

