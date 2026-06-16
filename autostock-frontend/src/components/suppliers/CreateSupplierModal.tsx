import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, X } from 'lucide-react';
import type { Supplier } from '../../types';

export interface CreateSupplierFormValues {
  name: string;
  phone: string;
}

interface CreateSupplierModalProps {
  open: boolean;
  supplier?: Supplier | null;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: CreateSupplierFormValues) => void;
}

export function CreateSupplierModal({
  open,
  supplier,
  saving,
  error,
  onClose,
  onSubmit,
}: CreateSupplierModalProps) {
  const isEdit = !!supplier;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!open) return;
    if (supplier) {
      setName(supplier.name);
      setPhone(supplier.phone ?? '');
    } else {
      setName('');
      setPhone('');
    }
  }, [open, supplier]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ name, phone });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">
            {isEdit ? 'تعديل المورد' : 'مورّد جديد'}
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
