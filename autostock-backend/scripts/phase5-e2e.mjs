const BASE = 'http://localhost:3000';
const today = new Date().toISOString().slice(0, 10);
const report = [];

async function req(method, path, body, token, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json, raw: text };
}

function step(name, ok, detail) {
  report.push({ name, ok, detail });
  console.log(`[${ok ? 'OK' : 'FAIL'}] ${name}`);
  if (detail) console.log(JSON.stringify(detail, null, 2));
}

async function main() {
  const login = await req('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  const token = login.body.accessToken;

  const categories = await req('GET', '/categories', null, token);
  const categoryId = categories.body[0]?.id;
  const locationId = (await req('GET', '/locations', null, token)).body[0]?.id;

  // 1 Product
  const prod = await req('POST', '/products', {
    sku: `E2E-FINAL-${Date.now()}`,
    name: 'E2E Final Product',
    categoryId,
    costPrice: 100000,
    retailPrice: 120000,
    wholesalePrice: 110000,
    minStockAlert: 1,
    unit: 'كرتون',
    unitsPerCarton: 10,
  }, token);
  const productId = prod.body.id;
  step('Product create', prod.status === 201, { productId });

  // 2 Purchase
  const supplier = await req('POST', '/suppliers', { name: `E2E Sup ${Date.now()}`, phone: '07711111111' }, token);
  const po = await req('POST', '/purchase-orders', {
    supplierId: supplier.body.id,
    items: [{ productId, qty: 5, unitCost: 100000 }],
  }, token);
  step('Purchase order', po.status === 201, { poId: po.body.id });

  // 3 Receive
  const receive = await req('PATCH', `/purchase-orders/${po.body.id}/receive`, {
    locationId,
  }, token, { 'x-client-uuid': crypto.randomUUID() });
  step('Receive PO', receive.body?.status === 'APPLIED', { response: receive.body });

  const stockMid = await req('GET', `/stock/balances?productId=${productId}`, null, token);
  step('Stock after receive', parseFloat(stockMid.body.items?.[0]?.quantity ?? 0) >= 5, {
    qty: stockMid.body.items?.[0]?.quantity,
  });

  // 4 Sale
  const sale = await req('POST', '/sales', {
    type: 'retail',
    paymentType: 'cash',
    items: [{ productId, locationId, qty: 1, unitPrice: 120000, unitCost: 10000 }],
  }, token, { 'x-client-uuid': crypto.randomUUID() });
  const saleId = sale.body?.result?.domain?.saleId;
  step('Sale', sale.body?.status === 'APPLIED', { saleId, response: sale.body });

  // 5 Customer + debt sale + payment
  const customer = await req('POST', '/customers', { name: 'E2E Customer', phone: '07722222222', type: 'retail' }, token);
  const debtSale = await req('POST', '/sales', {
    customerId: customer.body.id,
    type: 'retail',
    paymentType: 'debt',
    items: [{ productId, locationId, qty: 1, unitPrice: 120000, unitCost: 10000 }],
  }, token, { 'x-client-uuid': crypto.randomUUID() });
  step('Debt sale', debtSale.body?.status === 'APPLIED', { response: debtSale.body });

  const balanceBefore = await req('GET', `/customers/${customer.body.id}/balance`, null, token);
  const payment = await req('POST', '/payments', {
    partyType: 'CUSTOMER',
    partyId: customer.body.id,
    amount: 50000,
    method: 'cash',
    direction: 'IN',
    memo: 'E2E payment',
  }, token, { 'x-client-uuid': crypto.randomUUID() });
  const balanceAfter = await req('GET', `/customers/${customer.body.id}/balance`, null, token);
  step('Customer payment', payment.body?.status === 'APPLIED', {
    balanceBefore: balanceBefore.body,
    balanceAfter: balanceAfter.body,
    payment: payment.body,
  });

  // 6 Report
  const daily = await req('GET', `/reports/daily?date=${today}`, null, token);
  step('Daily report', daily.status === 200, { status: daily.status, keys: Object.keys(daily.body || {}) });

  // 7 Backup
  const backup = await req('GET', '/backup/download', null, token);
  const backupOk = backup.status === 200 && backup.raw.includes('"exportedAt"');
  step('Backup download', backupOk, { status: backup.status, bytes: backup.raw.length });

  // 8 Restore dry-run
  let backupJson;
  try { backupJson = JSON.parse(backup.raw); } catch { backupJson = null; }
  const dryRun = backupJson
    ? await req('POST', '/backup/restore/dry-run', backupJson, token)
    : { status: 0, body: { error: 'no backup json' } };
  step('Restore dry-run', dryRun.status === 201 || dryRun.status === 200, {
    status: dryRun.status,
    body: dryRun.body,
  });

  const ok = report.filter(r => r.ok).length;
  const fail = report.filter(r => !r.ok).length;
  console.log(`\nE2E: ${ok} passed, ${fail} failed`);
}

main().catch(console.error);
