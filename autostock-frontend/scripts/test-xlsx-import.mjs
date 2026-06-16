import XLSX from 'xlsx';

const BASE = 'http://localhost:3000';
const xlsxPath = 'c:/Users/hp/Desktop/autostock-frontend/test-import-products.xlsx';

async function req(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

const wb = XLSX.readFile(xlsxPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const items = XLSX.utils.sheet_to_json(sheet);

const login = await req('POST', '/auth/login', { username: 'admin', password: 'admin123' });
const token = login.body.accessToken;

const importRes = await req('POST', '/products/bulk-import', { items }, token);

console.log('=== EXCEL FILE ROWS ===', items.length);
console.log('=== IMPORT RESPONSE ===');
console.log(JSON.stringify(importRes.body, null, 2));
