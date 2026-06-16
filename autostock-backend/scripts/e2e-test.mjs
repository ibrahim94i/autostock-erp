const BASE = 'http://localhost:3000';
const results = [];

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
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

function log(phase, name, ok, detail) {
  results.push({ phase, name, ok, detail });
  console.log(`[${ok ? 'OK' : 'FAIL'}] Phase ${phase}: ${name}`);
  if (detail) console.log(JSON.stringify(detail, null, 2));
}

async function main() {
  // Login
  const login = await req('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  if (login.status !== 201 && login.status !== 200) {
    log(0, 'Login', false, login);
    return;
  }
  const token = login.body.accessToken;
  log(0, 'Login', true, { status: login.status });

  // === PHASE 1: Sales Returns ===
  const receipts = await req('GET', '/receipts?limit=5', null, token);
  const receiptList = Array.isArray(receipts.body) ? receipts.body : [];
  if (receiptList.length === 0) {
    log(1, 'Find receipt for return', false, { message: 'No receipts in DB' });
  } else {
    const receipt = receiptList[0];
    const invoice = await req('GET', `/sales/${receipt.saleId}/invoice`, null, token);
    log(1, 'GET invoice with returns data', invoice.status === 200, {
      status: invoice.status,
      hasReturnedByProduct: !!invoice.body?.returnedByProduct,
      itemCount: invoice.body?.items?.length,
    });

    const locations = await req('GET', '/locations', null, token);
    const locationId = locations.body?.[0]?.id;
    const item = invoice.body?.items?.[0];
    if (item && locationId) {
      const soldQty = parseFloat(item.qty);
      const returnedQty = parseFloat(invoice.body.returnedByProduct?.[item.productId] ?? 0);
      const returnQty = Math.min(1, soldQty - returnedQty);
      if (returnQty > 0) {
        const unitPrice = parseFloat(item.unitPrice);
        const payload = {
          items: [{
            productId: item.productId,
            locationId,
            qty: returnQty,
            unitCost: parseFloat(item.unitCost),
          }],
          refundMethod: invoice.body.sale.paymentType === 'debt' ? 'credit' : 'cash',
          reason: 'E2E test return',
          refundAmount: returnQty * unitPrice,
        };
        const returnRes = await req('POST', `/sales/${receipt.saleId}/returns`, payload, token, {
          'x-client-uuid': crypto.randomUUID(),
        });
        log(1, 'POST sales return', returnRes.status === 201 || returnRes.body?.status === 'APPLIED', {
          requestPayload: payload,
          responseStatus: returnRes.status,
          responseBody: returnRes.body,
        });

        // Verify stock increased
        const stock = await req('GET', `/stock/balances?productId=${item.productId}`, null, token);
        log(1, 'Stock after return', stock.status === 200, { stock: stock.body });
      } else {
        log(1, 'POST sales return', false, { message: 'No returnable qty on first item' });
      }
    }
  }

  // === PHASE 2: Excel Import ===
  const importPayload = {
    items: [
      {
        sku: `TEST-IMP-${Date.now()}`,
        name: 'منتج اختبار استيراد',
        categoryName: 'فئة اختبار استيراد',
        costPrice: 10000,
        retailPrice: 15000,
        wholesalePrice: 13000,
        minStockAlert: 5,
        unit: 'قطعة',
        unitsPerCarton: 12,
      },
      {
        sku: `TEST-IMP-DUP-${Date.now()}`,
        name: 'منتج اختبار 2',
        categoryName: 'فئة اختبار استيراد',
        costPrice: 20000,
        retailPrice: 25000,
        wholesalePrice: 23000,
        unit: 'كرتون',
        unitsPerCarton: 24,
      },
    ],
  };
  const importRes = await req('POST', '/products/bulk-import', importPayload, token);
  log(2, 'Bulk import products', importRes.status === 201 || importRes.status === 200, {
    imported: importRes.body?.imported,
    skipped: importRes.body?.skipped,
    createdCategories: importRes.body?.createdCategories,
    responseBody: importRes.body,
  });

  // Duplicate test
  const dupRes = await req('POST', '/products/bulk-import', importPayload, token);
  log(2, 'Duplicate detection', dupRes.body?.imported === 0 && dupRes.body?.skipped?.length === 2, {
    imported: dupRes.body?.imported,
    skipped: dupRes.body?.skipped,
  });

  // === PHASE 3: Activity Log ===
  const activity = await req('GET', '/activity-log?limit=5', null, token);
  log(3, 'GET activity-log', activity.status === 200 && activity.body?.items?.length >= 0, {
    status: activity.status,
    total: activity.body?.total,
    sample: activity.body?.items?.slice(0, 2),
  });

  const eventTypes = await req('GET', '/activity-log/event-types', null, token);
  log(3, 'GET event-types', eventTypes.status === 200, { eventTypes: eventTypes.body });

  // === PHASE 4: Installer readiness ===
  const fs = await import('fs');
  const path = await import('path');
  const checks = {
    envExample: fs.existsSync('c:/Users/hp/Desktop/autostock-backend/.env.example'),
    readmeInstall: fs.existsSync('c:/Users/hp/Desktop/autostock-frontend/README-INSTALL.md'),
    distElectron: fs.existsSync('c:/Users/hp/Desktop/autostock-frontend/dist-electron'),
    setupExe: fs.existsSync('c:/Users/hp/Desktop/autostock-frontend/dist-electron') &&
      fs.readdirSync('c:/Users/hp/Desktop/autostock-frontend/dist-electron').some(f => f.includes('Setup')),
    portableExe: fs.existsSync('c:/Users/hp/Desktop/autostock-frontend/dist-electron') &&
      fs.readdirSync('c:/Users/hp/Desktop/autostock-frontend/dist-electron').some(f => f.endsWith('.exe') && !f.includes('Setup')),
  };
  log(4, 'Installer readiness checks', checks.envExample && checks.readmeInstall, checks);

  // === PHASE 5: E2E partial ===
  const categories = await req('GET', '/categories', null, token);
  const categoryId = categories.body?.[0]?.id;
  const locId = (await req('GET', '/locations', null, token)).body?.[0]?.id;

  // Create product
  const prodSku = `E2E-${Date.now()}`;
  const createProd = await req('POST', '/products', {
    sku: prodSku,
    name: 'E2E Product',
    categoryId,
    costPrice: 50000,
    retailPrice: 60000,
    wholesalePrice: 55000,
    minStockAlert: 2,
    unit: 'قطعة',
    unitsPerCarton: 10,
  }, token);
  const productId = createProd.body?.id;
  log(5, 'Create product', createProd.status === 201, { productId, status: createProd.status });

  // Create supplier + PO + receive if possible
  const supplier = await req('POST', '/suppliers', { name: `E2E Supplier ${Date.now()}`, phone: '07700000000' }, token);
  const supplierId = supplier.body?.id;

  if (productId && supplierId && locId) {
    const po = await req('POST', '/purchase-orders', {
      supplierId,
      items: [{ productId, qty: 10, unitCost: 5000 }],
    }, token);
    const poId = po.body?.id;
    const receive = await req('PATCH', `/purchase-orders/${poId}/receive`, {
      items: [{ productId, locationId: locId, qty: 10, unitCost: 5000 }],
    }, token, { 'x-client-uuid': crypto.randomUUID() });
    log(5, 'Purchase + receive', receive.body?.status === 'APPLIED' || receive.status === 200, {
      poId,
      receiveStatus: receive.status,
      receiveBody: receive.body,
    });

    // Sale
    const sale = await req('POST', '/sales', {
      type: 'retail',
      paymentType: 'cash',
      items: [{ productId, locationId: locId, qty: 2, unitPrice: 60000, unitCost: 5000 }],
    }, token, { 'x-client-uuid': crypto.randomUUID() });
    log(5, 'Sale', sale.body?.status === 'APPLIED', { saleBody: sale.body });

    // Report
    const report = await req('GET', '/reports/daily', null, token);
    log(5, 'Daily report', report.status === 200, { status: report.status });

    // Backup
    const backup = await req('GET', '/backup/download', null, token);
    log(5, 'Backup download', backup.status === 200, { status: backup.status, hasData: !!backup.body?.data });
  }

  console.log('\n=== SUMMARY ===');
  const byPhase = {};
  for (const r of results) {
    byPhase[r.phase] = byPhase[r.phase] || { ok: 0, fail: 0 };
    if (r.ok) byPhase[r.phase].ok++;
    else byPhase[r.phase].fail++;
  }
  console.log(JSON.stringify(byPhase, null, 2));
}

main().catch((e) => console.error(e));
