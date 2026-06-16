import { useEffect, useState, type FormEvent } from 'react';

import { Loader2, X } from 'lucide-react';

import type { Customer } from '../../types';

export interface CreateCustomerFormValues {
  name: string;
  phone: string;
  type: 'retail' | 'wholesale' | 'both';
}

interface CreateCustomerModalProps {
  open: boolean;
  customer?: Customer | null;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: CreateCustomerFormValues) => void;
}

export function CreateCustomerModal({
  open,
  customer,
  saving,
  error,
  onClose,
  onSubmit,
}: CreateCustomerModalProps) {
  const isEdit = !!customer;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<'retail' | 'wholesale' | 'both'>('retail');

  useEffect(() => {
    if (!open) return;
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone ?? '');
      setType(customer.type === 'wholesale' ? 'wholesale' : customer.type === 'both' ? 'both' : 'retail');
    } else {
      setName('');
      setPhone('');
      setType('retail');
    }
  }, [open, customer]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ name, phone, type });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">
            {isEdit ? 'تعديل العميل' : 'عميل جديد'}
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

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <label className="block text-sm font-medium text-slate-700">
            الاسم (مطلوب)
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            الهاتف (اختياري)
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            النوع
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as 'retail' | 'wholesale' | 'both')
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="retail">تجزئة</option>
              <option value="wholesale">جملة</option>
              <option value="both">تجزئة وجملة</option>
            </select>
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
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                'حفظ'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
