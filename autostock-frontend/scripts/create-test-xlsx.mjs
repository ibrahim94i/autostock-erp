const XLSX = await import('xlsx');
const path = 'c:/Users/hp/Desktop/autostock-frontend/test-import-products.xlsx';

const rows = [
  {
    sku: 'XLS-TEST-001',
    name: 'منتج Excel 1',
    categoryName: 'فئة Excel',
    costPrice: 12000,
    retailPrice: 18000,
    wholesalePrice: 16000,
    minStockAlert: 3,
    unit: 'قطعة',
    unitsPerCarton: 6,
  },
  {
    sku: 'XLS-TEST-002',
    name: 'منتج Excel 2',
    categoryName: 'فئة Excel',
    costPrice: 24000,
    retailPrice: 30000,
    wholesalePrice: 28000,
    minStockAlert: 2,
    unit: 'كرتون',
    unitsPerCarton: 12,
  },
];

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Products');
XLSX.writeFile(wb, path);
console.log('Created', path);
