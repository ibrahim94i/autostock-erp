const BASE = 'http://localhost:3000';

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
  return { status: res.status, body: json };
}

async function main() {
  const login = await req('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  const token = login.body.accessToken;

  const locations = await req('GET', '/locations', null, token);
  const locationId = locations.body[0].id;

  const products = await req('GET', '/products?limit=20', null, token);
  const stock = await req('GET', '/stock/balances?limit=20', null, token);
  const stocked = stock.body.items?.find(s => parseFloat(s.quantity) >= 2);
  if (!stocked) { console.log('No stocked products'); return; }
  const productId = stocked.productId;
  const product = products.body.items.find(p => p.id === productId) || { retailPrice: '12500', costPrice: '87500', unitsPerCarton: 10 };

  const stockBefore = await req('GET', `/stock/balances?productId=${productId}`, null, token);
  console.log('=== STOCK BEFORE ===');
  console.log(JSON.stringify(stockBefore.body, null, 2));

  // Create sale
  const unitPrice = parseFloat(product.retailPrice);
  const salePayload = {
    type: 'retail',
    paymentType: 'cash',
    items: [{ productId, locationId, qty: 2, unitPrice, unitCost: parseFloat(product.costPrice) / (product.unitsPerCarton || 1) }],
  };
  const saleRes = await req('POST', '/sales', salePayload, token, { 'x-client-uuid': crypto.randomUUID() });
  console.log('\n=== SALE REQUEST ===');
  console.log(JSON.stringify(salePayload, null, 2));
  console.log('\n=== SALE RESPONSE ===');
  console.log(JSON.stringify(saleRes.body, null, 2));

  if (saleRes.body?.status !== 'APPLIED') {
    console.log('Sale failed, aborting return test');
    return;
  }

  const saleId = saleRes.body.result?.domain?.saleId;
  await req('POST', '/receipts/log', {
    saleId,
    invoiceNumber: `RET-TEST-${Date.now()}`,
    totalAmount: unitPrice * 2,
  }, token);

  const invoice = await req('GET', `/sales/${saleId}/invoice`, null, token);
  const item = invoice.body.items[0];

  const returnPayload = {
    items: [{
      productId: item.productId,
      locationId,
      qty: 1,
      unitCost: parseFloat(item.unitCost),
    }],
    refundMethod: 'cash',
    reason: 'اختبار مرتجع فعلي',
    refundAmount: parseFloat(item.unitPrice),
  };

  const returnRes = await req('POST', `/sales/${saleId}/returns`, returnPayload, token, {
    'x-client-uuid': crypto.randomUUID(),
  });

  console.log('\n=== RETURN REQUEST PAYLOAD ===');
  console.log(JSON.stringify(returnPayload, null, 2));
  console.log('\n=== RETURN RESPONSE BODY ===');
  console.log(JSON.stringify(returnRes.body, null, 2));
  console.log('\n=== HTTP STATUS ===', returnRes.status);

  const stockAfter = await req('GET', `/stock/balances?productId=${productId}`, null, token);
  console.log('\n=== STOCK AFTER RETURN ===');
  console.log(JSON.stringify(stockAfter.body, null, 2));

  const invoiceAfter = await req('GET', `/sales/${saleId}/invoice`, null, token);
  console.log('\n=== RETURNED BY PRODUCT ===');
  console.log(JSON.stringify(invoiceAfter.body.returnedByProduct, null, 2));
}

main().catch(console.error);
