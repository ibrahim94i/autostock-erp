import * as XLSX from 'xlsx';

export function formatReportNumber(value: string | number): string {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (Number.isNaN(n)) return String(value);
  return Math.round(n).toLocaleString('ar-IQ');
}

function formatCellValue(value: string | number): string {
  if (typeof value === 'number') {
    return formatReportNumber(value);
  }
  const asNumber = Number(value);
  if (value !== '' && !Number.isNaN(asNumber) && String(value).trim() !== '') {
    return formatReportNumber(asNumber);
  }
  return String(value);
}

export function exportToExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number)[][],
  colWidths?: number[],
): void {
  const formattedRows = rows.map((row) => row.map(formatCellValue));
  const data = [headers, ...formattedRows];
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  worksheet['!sheetViews'] = [{ rightToLeft: true }];
  if (colWidths?.length) {
    worksheet['!cols'] = colWidths.map((width) => ({ wch: width }));
  }

  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}
