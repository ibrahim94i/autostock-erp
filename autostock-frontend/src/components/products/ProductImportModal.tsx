import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { FileUp, Loader2, X } from 'lucide-react';
import { bulkImportProducts, formatPrice } from '../../api';
import type { BulkImportProductRow, BulkImportResult } from '../../types';

interface ProductImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: { imported: number; skipped: number }) => void;
}

const EXPECTED_HEADERS = [
  'sku',
  'name',
  'categoryName',
  'costPrice',
  'retailPrice',
  'wholesalePrice',
  'minStockAlert',
  'unit',
  'unitsPerCarton',
];

function parseWorksheetRows(sheet: XLSX.WorkSheet): BulkImportProductRow[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  });

  const parsed: BulkImportProductRow[] = [];

  for (const row of rows) {
    const name = String(row.name ?? row['الاسم'] ?? '').trim();
    if (!name) continue;

    const categoryName = String(
      row.categoryName ?? row['الفئة'] ?? row.category ?? 'عام',
    ).trim();

    const costPrice = Number(row.costPrice ?? row['سعر التكلفة'] ?? 0);
    const retailPrice = Number(row.retailPrice ?? row['سعر التجزئة'] ?? 0);
    const wholesalePrice = Number(row.wholesalePrice ?? row['سعر الجملة'] ?? 0);

    if (!costPrice || !retailPrice || !wholesalePrice) continue;

    parsed.push({
      sku: String(row.sku ?? row['SKU'] ?? '').trim() || undefined,
      name,
      categoryName: categoryName || 'عام',
      costPrice,
      retailPrice,
      wholesalePrice,
      minStockAlert: Number(row.minStockAlert ?? row['حد التنبيه'] ?? 0) || 0,
      unit: String(row.unit ?? row['الوحدة'] ?? 'قطعة').trim() || 'قطعة',
      unitsPerCarton:
        Number(row.unitsPerCarton ?? row['قطع/كarton'] ?? row['قطع/كرتون'] ?? 1) || 1,
    });
  }

  return parsed;
}

export function ProductImportModal({ open, onClose, onSuccess }: ProductImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<BulkImportProductRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [importError, setImportError] = useState('');
  const [fileName, setFileName] = useState('');

  const importMutation = useMutation({
    mutationFn: () => bulkImportProducts(preview),
    onSuccess: (result: BulkImportResult) => {
      onSuccess({ imported: result.imported, skipped: result.skipped.length });
      setPreview([]);
      setFileName('');
      onClose();
    },
    onError: (err: Error) => setImportError(err.message),
  });

  if (!open) return null;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setParseError('');
    setImportError('');
    setPreview([]);

    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (loadEvent) => {
      try {
        const data = new Uint8Array(loadEvent.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          setParseError('الملف لا يحتوي على أوراق');
          return;
        }
        const rows = parseWorksheetRows(workbook.Sheets[sheetName]);
        if (rows.length === 0) {
          setParseError('لم يتم العثور على صفوف صالحة. تأكد من الأعمدة: ' + EXPECTED_HEADERS.join(', '));
          return;
        }
        setPreview(rows);
      } catch {
        setParseError('تعذر قراءة ملف Excel');
      }
    };

    reader.readAsArrayBuffer(file);
    event.target.value = '';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h2 className="text-lg font-semibold">استيراد منتجات من Excel</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4">
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-gray-600">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <FileUp className="h-4 w-4" />
              اختيار ملف xlsx
            </button>
            {fileName && <p className="mt-2 text-sm text-gray-500">{fileName}</p>}
            <p className="mt-3 text-xs text-gray-400">
              الأعمدة: sku, name, categoryName, costPrice, retailPrice, wholesalePrice, unit,
              unitsPerCarton
            </p>
          </div>

          {parseError && <p className="text-sm text-red-600">{parseError}</p>}
          {importError && <p className="text-sm text-red-600">{importError}</p>}

          {preview.length > 0 && (
            <>
              <p className="text-sm text-gray-600">
                معاينة {preview.length} منتج قبل الحفظ
              </p>
              <div className="max-h-72 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-right">SKU</th>
                      <th className="px-3 py-2 text-right">الاسم</th>
                      <th className="px-3 py-2 text-right">الفئة</th>
                      <th className="px-3 py-2 text-right">التكلفة</th>
                      <th className="px-3 py-2 text-right">التجزئة</th>
                      <th className="px-3 py-2 text-right">الجملة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {preview.map((row, index) => (
                      <tr key={`${row.sku ?? row.name}-${index}`}>
                        <td className="px-3 py-2">{row.sku ?? '—'}</td>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">{row.categoryName}</td>
                        <td className="px-3 py-2">{formatPrice(row.costPrice)}</td>
                        <td className="px-3 py-2">{formatPrice(row.retailPrice)}</td>
                        <td className="px-3 py-2">{formatPrice(row.wholesalePrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={preview.length === 0 || importMutation.isPending}
            onClick={() => importMutation.mutate()}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
          >
            {importMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            استيراد {preview.length > 0 ? `(${preview.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
