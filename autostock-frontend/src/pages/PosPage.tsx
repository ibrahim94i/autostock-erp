import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Printer,
  FileDown,
} from 'lucide-react';
import {
  createSale,
  fetchCustomers,
  fetchLocations,
  fetchProducts,
  fetchStockBalances,
  formatCount,
  formatPrice,
  logReceipt,
  UnauthorizedError,
} from '../api';
import {
  autoUnitPrice,
  cartLines,
  cartLineTotal,
  cartReducer,
  cartTotal,
  effectiveUnitPrice,
  lineApiUnitPrice,
  lineQtyLabel,
  productUnitCost,
  resolveSaleType,
  type CartLine,
  type PriceType,
} from '../pos/cartReducer';
import {
  computeInvoiceTotals,
  VISIBLE_RECEIPT_SIZES,
  RECEIPT_SIZE_LABELS,
  type InvoiceData,
  type ReceiptSize,
} from '../pos/invoiceUtils';
import type { CreateSalePayload, Product } from '../types';
import { formatCartonConversion, formatStockWithCartons, supportsCarton } from '../utils/units';
import { useSettings, normalizeReceiptSize } from '../context/SettingsContext';
import type { CompanySettings } from '../types';

function isInsufficientStock(reason: string): boolean {
  return /insufficient stock/i.test(reason);
}

function newClientUuid(): string {
  return crypto.randomUUID();
}

function buildInvoiceDataFromCart(
  lines: CartLine[],
  saleId: string,
  paymentType: 'cash' | 'debt',
  customerId: string | null,
  customerName: string | undefined,
  cashCustomerName: string | undefined,
  cashCustomerPhone: string | undefined,
  settings: CompanySettings,
): InvoiceData {
  const subtotal = lines.reduce((sum, line) => sum + cartLineTotal(line), 0);
  const totals = computeInvoiceTotals(subtotal, settings.defaultTaxRate);
  const priceType = resolveSaleType(lines);

  return {
    invoiceNumber: '—',
    saleId,
    appliedAt: new Date().toISOString(),
    companyName: settings.companyName,
    companyPhone: settings.companyPhone ?? undefined,
    companyAddress: settings.companyAddress ?? undefined,
    companyLogo: settings.companyLogo ?? undefined,
    taxNumber: settings.taxNumber ?? undefined,
    currency: settings.currency,
    receiptFooter: settings.defaultReceiptFooter,
    paymentType,
    priceType,
    customerId: customerId ?? undefined,
    customerName: customerName || undefined,
    cashCustomerName: cashCustomerName || undefined,
    cashCustomerPhone: cashCustomerPhone || undefined,
    lines: lines.map((line) => ({
      productName:
        line.saleUnit === 'carton'
          ? `${line.product.name} (${line.inputQty} ${lineQtyLabel(line)})`
          : line.product.name,
      sku: line.product.sku,
      qty: line.qty,
      unit: line.product.unit ?? 'قطعة',
      unitPrice: lineApiUnitPrice(line),
      lineTotal: cartLineTotal(line),
    })),
    ...totals,
  };
}

export function PosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { settings } = useSettings();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const clientUuidRef = useRef(newClientUuid());

  const [cart, dispatchCart] = useReducer(cartReducer, {});
  const [priceType, setPriceType] = useState<PriceType>('retail');
  const [paymentType, setPaymentType] = useState<'cash' | 'debt'>('cash');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [cashCustomerName, setCashCustomerName] = useState('');
  const [cashCustomerPhone, setCashCustomerPhone] = useState('');
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
  const [locationId, setLocationId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [receiptSize, setReceiptSize] = useState<ReceiptSize>(() =>
    normalizeReceiptSize(settings.receiptSize),
  );
  const [printError, setPrintError] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    document.title = 'نقطة البيع — AutoStock ERP';
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedProductSearch(productSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCustomerSearch(customerSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  useEffect(() => {
    if (paymentType === 'cash') {
      setCustomerId(null);
      setCustomerSearch('');
    } else {
      setCashCustomerName('');
      setCashCustomerPhone('');
    }
  }, [paymentType]);

  useEffect(() => {
    if (invoiceData === null) {
      setReceiptSize(normalizeReceiptSize(settings.receiptSize));
    }
  }, [settings.receiptSize, invoiceData]);

  const productsQuery = useQuery({
    queryKey: ['products', 'pos', debouncedProductSearch],
    queryFn: () =>
      fetchProducts({
        search: debouncedProductSearch || undefined,
        limit: 20,
        page: 1,
      }),
  });

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
    staleTime: 5 * 60_000,
  });

  const stockQuery = useQuery({
    queryKey: ['stock', 'balances', 'pos', locationId],
    queryFn: () =>
      fetchStockBalances({
        locationId,
        limit: 200,
        page: 1,
      }),
    enabled: Boolean(locationId),
    staleTime: 30_000,
  });

  const customersQuery = useQuery({
    queryKey: ['customers', 'pos', debouncedCustomerSearch],
    queryFn: () =>
      fetchCustomers({
        search: debouncedCustomerSearch || undefined,
        limit: 15,
        page: 1,
      }),
    enabled: paymentType === 'debt',
  });

  useEffect(() => {
    for (const err of [
      productsQuery.error,
      locationsQuery.error,
      stockQuery.error,
      customersQuery.error,
    ]) {
      if (err instanceof UnauthorizedError) {
        navigate('/login', { replace: true, state: { message: err.message } });
        return;
      }
    }
  }, [productsQuery.error, locationsQuery.error, stockQuery.error, customersQuery.error, navigate]);

  const locations = useMemo(() => {
    return (locationsQuery.data ?? []).map((loc) => ({
      id: loc.id,
      label: `${loc.zone} / ${loc.shelf} (${loc.code})`,
    }));
  }, [locationsQuery.data]);

  const stockByProductId = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of stockQuery.data?.items ?? []) {
      const qty =
        typeof item.quantity === 'string'
          ? parseFloat(item.quantity)
          : item.quantity;
      if (Number.isNaN(qty)) continue;
      totals.set(item.productId, (totals.get(item.productId) ?? 0) + qty);
    }
    return totals;
  }, [stockQuery.data]);

  function productStockQty(productId: string): number {
    return stockByProductId.get(productId) ?? 0;
  }

  useEffect(() => {
    if (!locationId && locations.length > 0) {
      setLocationId(locations[0].id);
    }
  }, [locations, locationId]);

  const lines = cartLines(cart);
  const total = cartTotal(cart);
  const selectedCustomer = customersQuery.data?.items.find((c) => c.id === customerId);

  function handleAddProduct(product: Product) {
    if (priceType === 'wholesale' && !supportsCarton(product.unitsPerCarton)) {
      setCheckoutError('الجملة بالكارتون فقط — حدّد «عدد القطع بالكارتون» للمنتج أولاً');
      return;
    }
    dispatchCart({
      type: 'ADD',
      product,
      priceType,
    });
    setRejectReason('');
    setCheckoutError('');
  }

  function handleNewSale() {
    setInvoiceData(null);
    setPrintError('');
    setRejectReason('');
    setCheckoutError('');
    dispatchCart({ type: 'CLEAR' });
    clientUuidRef.current = newClientUuid();
    setCustomerId(null);
    setCustomerSearch('');
    setCashCustomerName('');
    setCashCustomerPhone('');
    searchInputRef.current?.focus();
  }

  async function handlePrintInvoice() {
    if (!invoiceData) return;
    setPrintError('');
    try {
      const receipt = await logReceipt({
        saleId: invoiceData.saleId,
        totalAmount: invoiceData.total,
        customerName: invoiceData.customerName || invoiceData.cashCustomerName,
      });
      const toPrint = { ...invoiceData, invoiceNumber: receipt.invoiceNumber };
      setInvoiceData(toPrint);
      const ok = (await import('../pos/invoicePrint')).printInvoice(toPrint, receiptSize);
      if (!ok) {
        setPrintError('تعذّر فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة');
      }
    } catch (err) {
      setPrintError(err instanceof Error ? err.message : 'فشل حفظ الوصل');
    }
  }

  async function handleSavePdf() {
    if (!invoiceData) return;
    setPrintError('');
    const ok = (await import('../pos/invoicePrint')).saveInvoicePdf(invoiceData, receiptSize);
    if (!ok) {
      setPrintError('تعذّر فتح نافذة الحفظ — اسمح بالنوافذ المنبثقة');
    }
  }

  async function handleCheckout() {
    setCheckoutError('');
    setRejectReason('');

    if (lines.length === 0) {
      setCheckoutError('السلة فارغة — أضف منتجات أولاً');
      return;
    }
    if (paymentType === 'debt' && !customerId) {
      setCheckoutError('يجب اختيار عميل للبيع الآجل');
      return;
    }
    if (!locationId) {
      setCheckoutError('لم يتم تحديد موقع المخزون');
      return;
    }

    setSubmitting(true);

    try {
      const payload: CreateSalePayload = {
        type: resolveSaleType(lines),
        paymentType,
        ...(paymentType === 'debt' && customerId ? { customerId } : {}),
        items: lines.map((line) => ({
          productId: line.product.id,
          locationId,
          qty: line.qty,
          unitPrice: lineApiUnitPrice(line),
          unitCost: productUnitCost(line.product),
        })),
      };

      const result = await createSale(payload, clientUuidRef.current);

      if (result.status === 'APPLIED') {
        const saleId = result.saleId ?? crypto.randomUUID();
        const customerName =
          paymentType === 'debt'
            ? selectedCustomer?.name || customerSearch.trim() || undefined
            : undefined;
        const cashName =
          paymentType === 'cash' ? cashCustomerName.trim() || undefined : undefined;
        const cashPhone =
          paymentType === 'cash' ? cashCustomerPhone.trim() || undefined : undefined;

        const invoice = buildInvoiceDataFromCart(
          lines,
          saleId,
          paymentType,
          customerId,
          customerName,
          cashName,
          cashPhone,
          settings,
        );

        try {
          const receipt = await logReceipt({
            saleId,
            totalAmount: invoice.total,
            customerName: customerName || cashName,
          });
          setInvoiceData({ ...invoice, invoiceNumber: receipt.invoiceNumber });
          await queryClient.invalidateQueries({ queryKey: ['receipts'] });
        } catch (logErr) {
          setInvoiceData(invoice);
          setPrintError(
            logErr instanceof Error ? logErr.message : 'تم البيع لكن فشل حفظ الوصل في السجل',
          );
        }

        setReceiptSize(normalizeReceiptSize(settings.receiptSize));
        dispatchCart({ type: 'CLEAR' });
        clientUuidRef.current = newClientUuid();
        setCustomerId(null);
        setCustomerSearch('');
        setCashCustomerName('');
        setCashCustomerPhone('');
        return;
      }

      setRejectReason(result.reason);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        navigate('/login', { replace: true, state: { message: err.message } });
        return;
      }
      setCheckoutError(err instanceof Error ? err.message : 'فشل إتمام البيع');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="-m-4 flex min-h-screen flex-col overflow-hidden bg-slate-100 lg:-m-6 lg:h-[calc(100vh-4rem)] lg:min-h-0">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">نقطة البيع</h2>
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-600">
          <ShoppingCart className="h-4 w-4" />
          <span>{lines.length} صنف</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Search + Products — right 45% in RTL on desktop */}
        <section className="flex h-full min-h-0 w-full shrink-0 flex-col border-b border-slate-200 bg-slate-50 lg:w-[45%] lg:border-b-0 lg:border-e">
          <div className="shrink-0 border-b border-slate-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-semibold text-slate-600">
              بحث منتج
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute start-4 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="اسم المنتج أو SKU — Enter لإضافة أول نتيجة"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const first = productsQuery.data?.items[0];
                      if (first) handleAddProduct(first);
                    }
                  }}
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-4 pe-5 ps-14 text-xl font-medium outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {productsQuery.isLoading && (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-lg">جاري البحث...</span>
              </div>
            )}

            {productsQuery.isError && !(productsQuery.error instanceof UnauthorizedError) && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-red-600">
                {productsQuery.error instanceof Error
                  ? productsQuery.error.message
                  : 'فشل تحميل المنتجات'}
              </p>
            )}

            {!productsQuery.isLoading && !productsQuery.isError && (
              <>
                {(productsQuery.data?.items.length ?? 0) === 0 ? (
                  <p className="py-16 text-center text-lg text-slate-400">
                    {debouncedProductSearch ? 'لا توجد نتائج' : 'ابدأ بالبحث عن منتج'}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
                    {(productsQuery.data?.items ?? []).map((product) => {
                      const stockQty = productStockQty(product.id);
                      const outOfStock = stockQty <= 0;
                      const unitPrice =
                        priceType === 'retail'
                          ? product.retailPrice
                          : product.wholesalePrice;
                      const priceUnitLabel = priceType === 'retail' ? ' / قطعة' : ' / كارتون';

                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleAddProduct(product)}
                          className={[
                            'flex flex-col rounded-xl border p-4 text-start shadow-sm transition',
                            outOfStock
                              ? 'border-slate-200 bg-slate-100 opacity-75 hover:opacity-90'
                              : 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-md active:scale-[0.97]',
                          ].join(' ')}
                        >
                          <p
                            className={[
                              'line-clamp-2 text-base font-bold leading-snug',
                              outOfStock ? 'text-slate-500' : 'text-slate-900',
                            ].join(' ')}
                          >
                            {product.name}
                          </p>
                          <p className="mt-1 font-mono text-xs text-slate-400">{product.sku}</p>
                          <p
                            className={[
                              'mt-3 text-xl font-extrabold',
                              outOfStock ? 'text-slate-400' : 'text-blue-700',
                            ].join(' ')}
                          >
                            {formatPrice(unitPrice)}
                            <span className="text-sm font-semibold text-slate-500">{priceUnitLabel}</span>
                          </p>
                          {outOfStock ? (
                            <span className="mt-2 inline-block self-start rounded-md bg-slate-300 px-2 py-0.5 text-xs font-bold text-slate-600">
                              نفد
                            </span>
                          ) : (
                            <span className="mt-2 text-sm font-semibold text-emerald-600">
                              متبقي:{' '}
                              {supportsCarton(product.unitsPerCarton)
                                ? formatStockWithCartons(stockQty, product.unitsPerCarton)
                                : `${formatCount(stockQty)} ${product.unit}`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Cart — left 55% in RTL */}
        <section className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white lg:w-[55%]">
          <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-5 py-3">
            <h3 className="text-xl font-bold text-slate-900">
              السلة — {lines.length} {lines.length === 1 ? 'صنف' : 'صنف'}
            </h3>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
            {lines.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-slate-300">
                <ShoppingCart className="h-14 w-14" />
                <p className="text-lg font-medium">السلة فارغة</p>
              </div>
            ) : (
              <ul>
                {lines.map((line) => {
                  const lineTotal = cartLineTotal(line);
                  const upc = line.product.unitsPerCarton ?? 1;
                  const conversionHint = formatCartonConversion(
                    line.inputQty,
                    line.saleUnit,
                    upc,
                  );
                  const isWholesale = line.priceType === 'wholesale';
                  return (
                    <li
                      key={line.lineKey}
                      className="border-b border-slate-200 py-3 last:border-b-0"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium leading-snug break-words whitespace-normal text-slate-900">
                          {line.product.name}
                        </p>
                        <span
                          className={[
                            'rounded-md px-2 py-0.5 text-xs font-bold',
                            isWholesale
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800',
                          ].join(' ')}
                        >
                          {isWholesale ? 'جملة · كارتون' : 'مفرد · قطعة'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        كلفة القطعة: {formatPrice(productUnitCost(line.product))} د.ع
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span className="font-semibold">
                            السعر / {line.saleUnit === 'carton' ? 'كارتون' : 'قطعة'}
                          </span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={effectiveUnitPrice(line)}
                            onChange={(e) => {
                              const next = parseFloat(e.target.value);
                              if (Number.isNaN(next) || next <= 0) return;
                              const auto = autoUnitPrice(line.product, line.priceType);
                              dispatchCart({
                                type: 'SET_CUSTOM_PRICE',
                                lineKey: line.lineKey,
                                customPrice:
                                  Math.abs(next - auto) < 0.001 ? undefined : next,
                              });
                            }}
                            className="h-9 w-24 rounded-lg border border-slate-300 px-2 text-center text-sm font-bold outline-none focus:border-blue-500"
                          />
                        </label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              dispatchCart({ type: 'DECREMENT', lineKey: line.lineKey })
                            }
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={line.inputQty}
                            onChange={(e) => {
                              const inputQty = parseInt(e.target.value, 10);
                              if (Number.isNaN(inputQty)) return;
                              dispatchCart({
                                type: 'SET_INPUT_QTY',
                                lineKey: line.lineKey,
                                inputQty,
                              });
                            }}
                            className="h-11 w-12 rounded-lg border border-slate-300 text-center text-base font-bold outline-none focus:border-blue-500"
                          />
                          <span className="text-xs font-semibold text-slate-500">
                            {lineQtyLabel(line)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              dispatchCart({ type: 'INCREMENT', lineKey: line.lineKey })
                            }
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="ms-auto text-lg font-bold text-slate-900">
                          {formatPrice(lineTotal)}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            dispatchCart({ type: 'REMOVE', lineKey: line.lineKey })
                          }
                          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                          aria-label="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {conversionHint && (
                        <p className="mt-1 text-xs font-medium text-slate-500">{conversionHint}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="shrink-0 space-y-3 border-t-2 border-slate-200 bg-slate-50 p-4">
            <p className="text-center text-xs font-medium text-slate-500">
              نوع الإضافة للمنتجات الجديدة — المفرد قطع · الجملة كراتين
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(['retail', 'wholesale'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPriceType(type)}
                  className={[
                    'rounded-lg py-2.5 text-sm font-bold transition',
                    priceType === type
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100',
                  ].join(' ')}
                >
                  {type === 'retail' ? 'مفرد' : 'جملة'}
                </button>
              ))}
              {(['cash', 'debt'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPaymentType(type)}
                  className={[
                    'rounded-lg py-2.5 text-sm font-bold transition',
                    paymentType === type
                      ? 'bg-slate-700 text-white'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100',
                  ].join(' ')}
                >
                  {type === 'cash' ? 'نقد' : 'آجل'}
                </button>
              ))}
            </div>

            {locations.length > 0 && (
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                aria-label="موقع المخزون"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.label}
                  </option>
                ))}
              </select>
            )}

            {paymentType === 'cash' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={cashCustomerName}
                  onChange={(e) => setCashCustomerName(e.target.value)}
                  placeholder="اسم الزبون (اختياري)"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                <input
                  type="tel"
                  value={cashCustomerPhone}
                  onChange={(e) => setCashCustomerPhone(e.target.value)}
                  placeholder="رقم الهاتف (اختياري)"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
            )}

            {paymentType === 'debt' && (
              <div>
                <input
                  type="search"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setCustomerId(null);
                  }}
                  placeholder="ابحث عن عميل (إلزامي)..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
                {selectedCustomer && (
                  <p className="mt-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                    ✓ {selectedCustomer.name}
                  </p>
                )}
                {!customerId && (customersQuery.data?.items.length ?? 0) > 0 && (
                  <ul className="mt-1 max-h-24 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                    {customersQuery.data!.items.map((customer) => (
                      <li key={customer.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerId(customer.id);
                            setCustomerSearch(customer.name);
                          }}
                          className="w-full px-3 py-1.5 text-start text-sm hover:bg-slate-50"
                        >
                          {customer.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {checkoutError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {checkoutError}
              </p>
            )}

            {rejectReason && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div>
                    <p className="font-bold">تم رفض البيع</p>
                    <p className="mt-0.5">{rejectReason}</p>
                    {isInsufficientStock(rejectReason) && (
                      <p className="mt-1 font-medium">
                        قلّل الكمية في السلة ثم أعد المحاولة — السلة محفوظة.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-emerald-800 px-4 py-3 text-white">
              <p className="text-sm text-emerald-200">الإجمالي</p>
              <p className="text-3xl font-extrabold">{formatPrice(total)} د.ع</p>
            </div>

            <button
              type="button"
              onClick={() => void handleCheckout()}
              disabled={submitting || lines.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-4 text-xl font-extrabold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  جاري إتمام البيع...
                </>
              ) : (
                'إتمام البيع'
              )}
            </button>
          </div>
        </section>
      </div>

      {/* Success overlay + invoice actions */}
      {invoiceData !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
              <h3 className="mt-4 text-2xl font-bold text-slate-900">تم البيع بنجاح</h3>
              <p className="mt-2 text-slate-600">
                رقم الفاتورة:{' '}
                <span className="font-mono text-sm font-semibold text-slate-900">
                  {invoiceData.invoiceNumber}
                </span>
              </p>
            </div>

            <fieldset className="mt-6">
              <legend className="mb-2 text-sm font-medium text-slate-700">حجم الطباعة</legend>
              <div className="flex gap-2">
                {VISIBLE_RECEIPT_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setReceiptSize(size)}
                    className={[
                      'flex-1 rounded-lg py-2.5 text-sm font-semibold transition',
                      receiptSize === size
                        ? 'bg-slate-800 text-white'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {RECEIPT_SIZE_LABELS[size]}
                  </button>
                ))}
              </div>
            </fieldset>

            {printError && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{printError}</p>
            )}

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={handlePrintInvoice}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-3.5 text-base font-bold text-white hover:bg-slate-900"
              >
                <Printer className="h-5 w-5" />
                طباعة الفاتورة
              </button>
              <button
                type="button"
                onClick={handleSavePdf}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white py-3.5 text-base font-bold text-slate-800 hover:bg-slate-50"
              >
                <FileDown className="h-5 w-5" />
                حفظ PDF
              </button>
              <button
                type="button"
                onClick={handleNewSale}
                className="w-full rounded-xl bg-blue-600 py-3.5 text-lg font-bold text-white hover:bg-blue-700"
              >
                بيع جديد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
