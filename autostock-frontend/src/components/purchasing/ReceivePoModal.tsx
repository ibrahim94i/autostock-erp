import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, X } from 'lucide-react';
import { formatLocation, shortId } from '../../api';
import type { Location } from '../../types';

interface ReceivePoModalProps {
  open: boolean;
  poId: string | null;
  poLabel: string;
  locations: Location[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (locationId: string) => void;
}

export function ReceivePoModal({
  open,
  poId,
  poLabel,
  locations,
  saving,
  error,
  onClose,
  onSubmit,
}: ReceivePoModalProps) {
  const [locationId, setLocationId] = useState('');

  useEffect(() => {
    if (!open) return;
    if (locations.length > 0) {
      setLocationId(locations[0].id);
    }
  }, [open, locations]);

  if (!open || !poId) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(locationId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">استلام أمر الشراء</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {poLabel || shortId(poId)}
            </p>
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
          <p className="text-sm text-slate-600">
            سيتم إضافة بنود الأمر إلى المخزون وتحديث رصيد المورّد تلقائياً.
          </p>

          <label className="block text-sm font-medium text-slate-700">
            موقع الاستلام
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

          {locations.length === 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              لا توجد مواقع — سيتم إنشاء «المخزن الرئيسي» تلقائياً عند تحميل الصفحة.
            </p>
          )}

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
              disabled={saving || !locationId}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الاستلام...
                </>
              ) : (
                'تأكيد الاستلام'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
