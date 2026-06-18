import type {
  ApiError,
  Category,
  CompanySettings,
  CreateProductPayload,
  CreateSalePayload,
  LoginResponse,
  PaginatedCustomers,
  PaginatedProducts,
  PaginatedPurchaseOrders,
  PaginatedStockBalances,
  PaginatedSuppliers,
  Product,
  ProductFormValues,
  ProductsQueryParams,
  PurchaseOrder,
  PurchaseOrdersQueryParams,
  CreatePurchaseOrderPayload,
  CreatePaymentPayload,
  CreateSupplierPayload,
  CreateCustomerPayload,
  Customer,
  CustomerBalanceResponse,
  CustomerStatementLine,
  DashboardSummary,
  ReceivePurchaseOrderPayload,
  ReceivePoDispatchResult,
  PaymentDispatchResult,
  SupplierBalanceResponse,
  ReconcileDispatchResult,
  ReconcileStockPayload,
  Location,
  LowStockAlert,
  SaleDispatchResult,
  StockBalancesQueryParams,
  Supplier,
  TopProductEntry,
  UpdateProductPayload,
  UpdateSettingsPayload,
  BackupDryRunResult,
  BackupRestoreResult,
  BackupScheduleConfig,
  UpdateBackupSchedulePayload,
  BackupPayload,
  DailyReport,
  SalesPeriodReportRow,
  ProductReportRow,
  CustomerReportRow,
  InventoryMovementRow,
  CashTodayResponse,
  CashRegister,
  CashTransaction,
  CashHistoryEntry,
  OpenCashRegisterPayload,
  CloseCashRegisterPayload,
  CreateCashDepositPayload,
  Expense,
  ExpenseCategory,
  ExpensesListResponse,
  CreateExpensePayload,
  CreateExpenseCategoryPayload,
  Receipt,
  LogReceiptPayload,
  SaleInvoiceResponse,
  CreateSaleReturnPayload,
  SaleReturnDispatchResult,
  BulkImportProductRow,
  BulkImportResult,
  ActivityLogResponse,
  ActivityLogUser,
} from './types';
import { UnauthorizedError } from './types';
import { poLineTotalFromStored } from './utils/units';

export { UnauthorizedError } from './types';

const TOKEN_KEY = 'autostock_access_token';
const REFRESH_TOKEN_KEY = 'autostock_refresh_token';
const USERNAME_KEY = 'autostock_username';
export const SETTINGS_CACHE_KEY = 'autostock_settings_cache';

const SESSION_EXPIRED_MESSAGE = 'انتهت جلستك، سجّل دخول مجدداً';

let refreshInFlight: Promise<boolean> | null = null;

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/** Relative paths in Vite dev (proxy); absolute URL in Electron / production. */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (import.meta.env.DEV && window.location.protocol !== 'file:') {
    return normalized;
  }
  return `${BASE_URL.replace(/\/$/, '')}${normalized}`;
}

export async function checkBackendConnection(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl('/health'));
    return res.ok;
  } catch {
    return false;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function persistAuthTokens(data: { accessToken: string; refreshToken?: string }): void {
  setToken(data.accessToken);
  if (data.refreshToken) {
    setRefreshToken(data.refreshToken);
  }
}

export function getTokenExpiryMs(token: string | null = getToken()): number | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { exp?: number };
    if (typeof payload.exp === 'number') {
      return payload.exp * 1000;
    }
  } catch {
    return null;
  }
  return null;
}

async function tryRefreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(apiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = (await res.json()) as { accessToken: string };
    setToken(data.accessToken);
    window.dispatchEvent(new Event('autostock:token-refreshed'));
    return true;
  } catch {
    return false;
  }
}

function getRefreshPromise(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = tryRefreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** Manual refresh — used by SessionWarning "تجديد الآن". */
export async function refreshSessionNow(): Promise<boolean> {
  return getRefreshPromise();
}

function failSession(): never {
  clearToken();
  window.dispatchEvent(new Event('autostock:session-expired'));
  throw new UnauthorizedError(SESSION_EXPIRED_MESSAGE);
}

export function getUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY);
}

export function setUsername(username: string): void {
  localStorage.setItem(USERNAME_KEY, username);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(SETTINGS_CACHE_KEY);
}

export function getUserRole(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function isAdmin(): boolean {
  return getUserRole() === 'admin';
}

export function canAccessReports(): boolean {
  const role = getUserRole();
  return role === 'admin' || role === 'accountant';
}

export function canAccessCashRegister(): boolean {
  const role = getUserRole();
  return role === 'admin' || role === 'cashier' || role === 'accountant';
}

export function canAccessSettings(): boolean {
  return getUserRole() === 'admin';
}

export function canAccessExpenses(): boolean {
  const role = getUserRole();
  return role === 'admin' || role === 'accountant';
}

export function canAccessReceipts(): boolean {
  const role = getUserRole();
  return role === 'admin' || role === 'cashier' || role === 'accountant';
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function executeFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(url), {
    ...init,
    headers: {
      ...authHeaders(),
      ...init?.headers,
    },
  });
}

/** Central authenticated fetch — handles 401 + token refresh in one place. */
export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await executeFetch(url, init);
  if (res.status !== 401) return res;

  if (url.startsWith('/auth/')) {
    failSession();
  }

  const refreshed = await getRefreshPromise();
  if (!refreshed) {
    failSession();
  }

  const retry = await executeFetch(url, init);
  if (retry.status === 401) {
    failSession();
  }

  return retry;
}

async function authedFetch(url: string, init?: RequestInit): Promise<Response> {
  return apiFetch(url, init);
}

export async function parseApiError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as ApiError;
    if (Array.isArray(data.message)) return data.message.join('، ');
    if (typeof data.message === 'string') return data.message;
    return 'حدث خطأ غير متوقع';
  } catch {
    return `خطأ ${res.status}`;
  }
}

export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(apiUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  const data = (await res.json()) as LoginResponse;
  persistAuthTokens(data);
  return data;
}

function buildProductsUrl(params: ProductsQueryParams): string {
  const searchParams = new URLSearchParams();
  if (params.search?.trim()) searchParams.set('search', params.search.trim());
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.categoryId) searchParams.set('categoryId', params.categoryId);
  const qs = searchParams.toString();
  return qs ? `/products?${qs}` : '/products';
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await authedFetch('/categories');

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<Category[]>;
}

export async function createCategory(payload: { name: string }): Promise<Category> {
  const res = await authedFetch('/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<Category>;
}

export async function updateCategory(id: string, payload: { name: string }): Promise<Category> {
  const res = await authedFetch(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<Category>;
}

export async function fetchProducts(
  params: ProductsQueryParams = {},
): Promise<PaginatedProducts> {
  const res = await authedFetch(buildProductsUrl(params));

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<PaginatedProducts>;
}

export async function createProduct(
  payload: CreateProductPayload,
): Promise<Product> {
  const res = await authedFetch('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<Product>;
}

export async function updateProduct(
  id: string,
  payload: UpdateProductPayload,
): Promise<Product> {
  const res = await authedFetch(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<Product>;
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await authedFetch(`/products/${id}`, { method: 'DELETE' });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }
}

export function formatPrice(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function productToFormValues(product: Product): ProductFormValues {
  return {
    sku: product.sku,
    name: product.name,
    costPrice: String(product.costPrice),
    retailPrice: String(product.retailPrice),
    wholesalePrice: String(product.wholesalePrice),
    minStockAlert: String(product.minStockAlert),
    unit: product.unit,
    unitsPerCarton: String(product.unitsPerCarton ?? 1),
    categoryId: product.categoryId,
  };
}

export const emptyProductForm = (): ProductFormValues => ({
  sku: '',
  name: '',
  costPrice: '',
  retailPrice: '',
  wholesalePrice: '',
  minStockAlert: '0',
  unit: 'pcs',
  unitsPerCarton: '1',
  categoryId: '',
});

export function formValuesToCreatePayload(
  values: ProductFormValues,
): CreateProductPayload {
  return {
    sku: values.sku.trim() || values.name.trim(),
    name: values.name.trim(),
    costPrice: Number(values.costPrice),
    retailPrice: Number(values.retailPrice),
    wholesalePrice: Number(values.wholesalePrice),
    minStockAlert: Number(values.minStockAlert),
    unit: values.unit.trim(),
    unitsPerCarton: Number(values.unitsPerCarton) || 1,
    categoryId: values.categoryId.trim(),
  };
}

export function formValuesToUpdatePayload(
  values: ProductFormValues,
): UpdateProductPayload {
  const payload: UpdateProductPayload = {
    sku: values.sku.trim(),
    name: values.name.trim(),
    costPrice: Number(values.costPrice),
    retailPrice: Number(values.retailPrice),
    wholesalePrice: Number(values.wholesalePrice),
    minStockAlert: Number(values.minStockAlert),
    unit: values.unit.trim(),
    unitsPerCarton: Number(values.unitsPerCarton) || 1,
  };
  if (values.categoryId.trim()) {
    payload.categoryId = values.categoryId.trim();
  }
  return payload;
}

export async function isProductSkuTaken(
  sku: string,
  excludeProductId?: string,
): Promise<boolean> {
  const normalized = sku.trim();
  if (!normalized) return false;

  const result = await fetchProducts({ search: normalized, limit: 50 });
  const needle = normalized.toLowerCase();
  return result.items.some(
    (product) =>
      product.sku.toLowerCase() === needle && product.id !== excludeProductId,
  );
}

function buildCustomersUrl(params: {
  search?: string;
  page?: number;
  limit?: number;
}): string {
  const searchParams = new URLSearchParams();
  if (params.search?.trim()) searchParams.set('search', params.search.trim());
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  return qs ? `/customers?${qs}` : '/customers';
}

export async function fetchCustomers(params: {
  search?: string;
  page?: number;
  limit?: number;
} = {}): Promise<PaginatedCustomers> {
  const res = await authedFetch(buildCustomersUrl(params));

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<PaginatedCustomers>;
}

export async function createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
  const res = await authedFetch('/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<Customer>;
}

export async function updateCustomer(
  id: string,
  payload: Partial<CreateCustomerPayload>,
): Promise<Customer> {
  const res = await authedFetch(`/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<Customer>;
}

export async function deleteCustomer(id: string): Promise<void> {
  const res = await authedFetch(`/customers/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await parseApiError(res));
}

export async function fetchCustomerBalance(id: string): Promise<CustomerBalanceResponse> {
  const res = await authedFetch(`/customers/${id}/balance`);

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<CustomerBalanceResponse>;
}

export async function fetchCustomerBalancesBulk(
  ids: string[],
): Promise<CustomerBalanceResponse[]> {
  const res = await authedFetch(`/customers/balances/bulk?ids=${ids.join(',')}`);

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<CustomerBalanceResponse[]>;
}

export async function fetchCustomerStatement(id: string): Promise<CustomerStatementLine[]> {
  const res = await authedFetch(`/customers/${id}/statement`);

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<CustomerStatementLine[]>;
}

export async function fetchStockBalances(
  params: StockBalancesQueryParams = {},
): Promise<PaginatedStockBalances> {
  const searchParams = new URLSearchParams();
  if (params.productId) searchParams.set('productId', params.productId);
  if (params.locationId) searchParams.set('locationId', params.locationId);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  const url = qs ? `/stock/balances?${qs}` : '/stock/balances';

  const res = await authedFetch(url);

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<PaginatedStockBalances>;
}

export async function fetchLocations(): Promise<Location[]> {
  const res = await authedFetch('/locations');

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<Location[]>;
}

export async function fetchLowAlerts(): Promise<LowStockAlert[]> {
  const res = await authedFetch('/stock/low-alerts');

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<LowStockAlert[]>;
}

export async function reconcileStock(
  payload: ReconcileStockPayload,
  clientUuid: string,
): Promise<ReconcileDispatchResult> {
  const res = await authedFetch('/stock/reconcile', {
    method: 'POST',
    headers: {
      'x-client-uuid': clientUuid,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  const data = (await res.json()) as DispatchResponse;

  if (data.status === 'REJECTED') {
    return {
      status: 'REJECTED',
      reason: data.reason ?? 'تم رفض العملية',
      idempotent: data.idempotent,
    };
  }

  if (data.status === 'APPLIED') {
    return { status: 'APPLIED', idempotent: data.idempotent };
  }

  return {
    status: 'REJECTED',
    reason: 'استجابة غير متوقعة من الخادم',
  };
}

export function formatLocation(location: {
  zone: string;
  shelf: string;
  code: string;
}): string {
  return `${location.zone} / ${location.shelf} (${location.code})`;
}

export function parseQuantity(value: string | number): number {
  return typeof value === 'string' ? parseFloat(value) : value;
}

interface DispatchResponse {
  status: string;
  reason?: string;
  result?: { domain?: { saleId?: string } };
  idempotent?: boolean;
}

export async function createSale(
  payload: CreateSalePayload,
  clientUuid: string,
): Promise<SaleDispatchResult> {
  const res = await authedFetch('/sales', {
    method: 'POST',
    headers: {
      'x-client-uuid': clientUuid,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  const data = (await res.json()) as DispatchResponse;

  if (data.status === 'REJECTED') {
    return {
      status: 'REJECTED',
      reason: data.reason ?? 'تم رفض العملية',
      idempotent: data.idempotent,
    };
  }

  if (data.status === 'APPLIED') {
    return {
      status: 'APPLIED',
      saleId: data.result?.domain?.saleId,
      idempotent: data.idempotent,
    };
  }

  return {
    status: 'REJECTED',
    reason: 'استجابة غير متوقعة من الخادم',
  };
}

function buildSuppliersUrl(params: {
  search?: string;
  page?: number;
  limit?: number;
}): string {
  const searchParams = new URLSearchParams();
  if (params.search?.trim()) searchParams.set('search', params.search.trim());
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  return qs ? `/suppliers?${qs}` : '/suppliers';
}

function buildPurchaseOrdersUrl(params: PurchaseOrdersQueryParams): string {
  const searchParams = new URLSearchParams();
  if (params.status) searchParams.set('status', params.status);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  return qs ? `/purchase-orders?${qs}` : '/purchase-orders';
}

export async function fetchSuppliers(params: {
  search?: string;
  page?: number;
  limit?: number;
} = {}): Promise<PaginatedSuppliers> {
  const res = await authedFetch(buildSuppliersUrl(params));

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<PaginatedSuppliers>;
}

export async function fetchPurchaseOrders(
  params: PurchaseOrdersQueryParams = {},
): Promise<PaginatedPurchaseOrders> {
  const res = await authedFetch(buildPurchaseOrdersUrl(params));

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<PaginatedPurchaseOrders>;
}

export async function fetchPurchaseOrder(id: string): Promise<PurchaseOrder> {
  const res = await authedFetch(`/purchase-orders/${id}`);

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<PurchaseOrder>;
}

export async function createPurchaseOrder(
  payload: CreatePurchaseOrderPayload,
): Promise<PurchaseOrder> {
  const res = await authedFetch('/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<PurchaseOrder>;
}

export async function receivePurchaseOrder(
  id: string,
  payload: ReceivePurchaseOrderPayload,
  clientUuid: string,
): Promise<ReceivePoDispatchResult> {
  const res = await authedFetch(`/purchase-orders/${id}/receive`, {
    method: 'PATCH',
    headers: {
      'x-client-uuid': clientUuid,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  const data = (await res.json()) as DispatchResponse;

  if (data.status === 'REJECTED') {
    return {
      status: 'REJECTED',
      reason: data.reason ?? 'تم رفض العملية',
      idempotent: data.idempotent,
    };
  }

  if (data.status === 'APPLIED') {
    return { status: 'APPLIED', idempotent: data.idempotent };
  }

  return {
    status: 'REJECTED',
    reason: 'استجابة غير متوقعة من الخادم',
  };
}

export function poLineTotal(
  qty: string | number,
  unitCost: string | number,
  unitsPerCarton = 1,
): number {
  return poLineTotalFromStored(parseQuantity(qty), parseQuantity(unitCost), unitsPerCarton);
}

export function poTotal(
  items: {
    qty: string | number;
    unitCost: string | number;
    productId?: string;
    product?: { unitsPerCarton?: number };
  }[],
  productCatalog?: Map<string, { unitsPerCarton?: number }>,
): number {
  return items.reduce((sum, item) => {
    const upc =
      item.product?.unitsPerCarton ??
      (item.productId ? productCatalog?.get(item.productId)?.unitsPerCarton : undefined) ??
      1;
    return sum + poLineTotal(item.qty, item.unitCost, upc);
  }, 0);
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export async function fetchSupplierBalance(id: string): Promise<SupplierBalanceResponse> {
  const res = await authedFetch(`/suppliers/${id}/balance`);

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<SupplierBalanceResponse>;
}

export async function fetchSupplierBalancesBulk(
  ids: string[],
): Promise<SupplierBalanceResponse[]> {
  const res = await authedFetch(`/suppliers/balances/bulk?ids=${ids.join(',')}`);

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<SupplierBalanceResponse[]>;
}

export async function createSupplier(payload: CreateSupplierPayload): Promise<Supplier> {
  const res = await authedFetch('/suppliers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<Supplier>;
}

export async function updateSupplier(
  id: string,
  payload: Partial<CreateSupplierPayload>,
): Promise<Supplier> {
  const res = await authedFetch(`/suppliers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<Supplier>;
}

export async function deleteSupplier(id: string): Promise<void> {
  const res = await authedFetch(`/suppliers/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await parseApiError(res));
}

export async function createPayment(
  payload: CreatePaymentPayload,
  clientUuid: string,
): Promise<PaymentDispatchResult> {
  const res = await authedFetch('/payments', {
    method: 'POST',
    headers: {
      'x-client-uuid': clientUuid,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  const data = (await res.json()) as DispatchResponse;

  if (data.status === 'REJECTED') {
    return {
      status: 'REJECTED',
      reason: data.reason ?? 'تم رفض العملية',
      idempotent: data.idempotent,
    };
  }

  if (data.status === 'APPLIED') {
    return { status: 'APPLIED', idempotent: data.idempotent };
  }

  return {
    status: 'REJECTED',
    reason: 'استجابة غير متوقعة من الخادم',
  };
}

export function balanceColorClass(balance: number): string {
  if (balance <= 0) return 'text-green-700 font-semibold';
  return 'text-orange-600 font-semibold';
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await authedFetch('/dashboard/summary');

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<DashboardSummary>;
}

export function parseTopProductsPeriod(period: string | undefined): TopProductEntry[] {
  if (!period?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(period);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is TopProductEntry =>
          typeof item === 'object' &&
          item !== null &&
          'productName' in item &&
          'totalQty' in item,
      )
      .map((item) => ({
        productId: String((item as TopProductEntry).productId ?? ''),
        productName: String((item as TopProductEntry).productName),
        totalQty: Number((item as TopProductEntry).totalQty),
      }));
  } catch {
    return [];
  }
}

export function formatMetricTime(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCount(value: number): string {
  return value.toLocaleString('ar-EG', { maximumFractionDigits: 0 });
}

export async function fetchSettings(): Promise<CompanySettings> {
  const res = await authedFetch('/settings');

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<CompanySettings>;
}

export async function updateSettings(
  payload: UpdateSettingsPayload,
): Promise<CompanySettings> {
  const res = await authedFetch('/settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<CompanySettings>;
}

export async function sendTelegramTest(): Promise<{
  ok: true;
  voice?: {
    ok: boolean;
    error?: string;
  };
}> {
  const res = await authedFetch('/telegram/test', { method: 'POST' });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<{
    ok: true;
    voice?: {
      ok: boolean;
      error?: string;
    };
  }>;
}

export async function downloadBackupFile(): Promise<void> {
  const res = await authedFetch('/backup/download');

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  const filenameMatch = disposition?.match(/filename="([^"]+)"/);
  const filename = filenameMatch?.[1] ?? `autostock-backup-${Date.now()}.json`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function dryRunBackup(backupData: BackupPayload): Promise<BackupDryRunResult> {
  const res = await authedFetch('/backup/restore/dry-run', {
    method: 'POST',
    body: JSON.stringify(backupData),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<BackupDryRunResult>;
}

export async function restoreBackup(
  confirmPassword: string,
  backupData: BackupPayload,
): Promise<BackupRestoreResult> {
  const res = await authedFetch('/backup/restore', {
    method: 'POST',
    body: JSON.stringify({ confirmPassword, backupData }),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<BackupRestoreResult>;
}

export async function fetchBackupSchedule(): Promise<BackupScheduleConfig> {
  const res = await authedFetch('/backup/schedule');

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<BackupScheduleConfig>;
}

export async function updateBackupSchedule(
  payload: UpdateBackupSchedulePayload,
): Promise<BackupScheduleConfig> {
  const res = await authedFetch('/backup/schedule', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  return res.json() as Promise<BackupScheduleConfig>;
}

function buildReportQuery(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return qs ? `?${qs}` : '';
}

export async function fetchDailyReport(date: string): Promise<DailyReport> {
  const res = await authedFetch(`/reports/daily${buildReportQuery({ date })}`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<DailyReport>;
}

export async function fetchSalesReport(
  from: string,
  to: string,
  groupBy: 'day' | 'month',
): Promise<SalesPeriodReportRow[]> {
  const res = await authedFetch(
    `/reports/sales${buildReportQuery({ from, to, groupBy })}`,
  );
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<SalesPeriodReportRow[]>;
}

export async function fetchProductsReport(
  from: string,
  to: string,
): Promise<ProductReportRow[]> {
  const res = await authedFetch(`/reports/products${buildReportQuery({ from, to })}`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<ProductReportRow[]>;
}

export async function fetchCustomersReport(
  from: string,
  to: string,
): Promise<CustomerReportRow[]> {
  const res = await authedFetch(`/reports/customers${buildReportQuery({ from, to })}`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<CustomerReportRow[]>;
}

export async function fetchInventoryMovementReport(
  from: string,
  to: string,
): Promise<InventoryMovementRow[]> {
  const res = await authedFetch(
    `/reports/inventory-movement${buildReportQuery({ from, to })}`,
  );
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<InventoryMovementRow[]>;
}

export async function fetchCashToday(): Promise<CashTodayResponse> {
  const res = await authedFetch('/cash/today');
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<CashTodayResponse>;
}

export async function openCashRegister(
  payload: OpenCashRegisterPayload,
): Promise<CashRegister> {
  const res = await authedFetch('/cash/open', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<CashRegister>;
}

export async function closeCashRegister(
  payload: CloseCashRegisterPayload,
): Promise<CashRegister> {
  const res = await authedFetch('/cash/close', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<CashRegister>;
}

export async function createCashDeposit(
  payload: CreateCashDepositPayload,
): Promise<CashTransaction> {
  const res = await authedFetch('/cash/deposit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<CashTransaction>;
}

export async function fetchCashHistory(
  from?: string,
  to?: string,
): Promise<CashHistoryEntry[]> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  const res = await authedFetch(`/cash/history${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<CashHistoryEntry[]>;
}

export function cashTransactionTypeLabel(type: string): string {
  switch (type) {
    case 'sale':
      return 'بيع نقدي';
    case 'payment_in':
      return 'دفعة مستلمة';
    case 'cash_deposit':
      return 'إيداع نقد';
    case 'payment_out':
      return 'دفعة مورد';
    case 'expense':
      return 'مصروف';
    default:
      return type;
  }
}

export { isCashOutflowTransaction } from './utils/cashSummary';

export async function fetchExpenses(params: {
  from?: string;
  to?: string;
  categoryId?: string;
}): Promise<ExpensesListResponse> {
  const search = new URLSearchParams();
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  if (params.categoryId) search.set('categoryId', params.categoryId);
  const qs = search.toString();
  const res = await authedFetch(`/expenses${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<ExpensesListResponse>;
}

export async function createExpense(payload: CreateExpensePayload): Promise<Expense> {
  const res = await authedFetch('/expenses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<Expense>;
}

export async function updatePurchaseOrder(
  id: string,
  payload: CreatePurchaseOrderPayload,
): Promise<PurchaseOrder> {
  const res = await authedFetch(`/purchase-orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<PurchaseOrder>;
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  const res = await authedFetch(`/purchase-orders/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await parseApiError(res));
}

export async function updateExpense(
  id: string,
  payload: {
    date?: string;
    amount?: number;
    categoryId?: string;
    description?: string;
  },
): Promise<Expense> {
  const res = await authedFetch(`/expenses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<Expense>;
}

export async function fetchExpenseCategories(): Promise<ExpenseCategory[]> {
  const res = await authedFetch('/expense-categories');
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<ExpenseCategory[]>;
}

export async function createExpenseCategory(
  payload: CreateExpenseCategoryPayload,
): Promise<ExpenseCategory> {
  const res = await authedFetch('/expense-categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<ExpenseCategory>;
}

export async function deleteExpense(id: string): Promise<void> {
  const res = await authedFetch(`/expenses/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await parseApiError(res));
}

export async function fetchNextReceiptNumber(): Promise<string> {
  const res = await authedFetch('/receipts/next-number');
  if (!res.ok) throw new Error(await parseApiError(res));
  const data = (await res.json()) as { invoiceNumber: string };
  return data.invoiceNumber;
}

export async function updateExpenseCategory(
  id: string,
  payload: CreateExpenseCategoryPayload,
): Promise<ExpenseCategory> {
  const res = await authedFetch(`/expense-categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<ExpenseCategory>;
}

export async function resetAllData(): Promise<{ message: string }> {
  const res = await authedFetch('/admin/reset-data', {
    method: 'POST',
    body: JSON.stringify({ confirm: 'RESET' }),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<{ message: string }>;
}

export async function logReceipt(payload: LogReceiptPayload): Promise<Receipt> {
  const res = await authedFetch('/receipts/log', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<Receipt>;
}

export async function fetchReceipts(params: {
  from?: string;
  to?: string;
  search?: string;
}): Promise<Receipt[]> {
  const searchParams = new URLSearchParams();
  if (params.from) searchParams.set('from', params.from);
  if (params.to) searchParams.set('to', params.to);
  if (params.search?.trim()) searchParams.set('search', params.search.trim());
  const qs = searchParams.toString();
  const res = await authedFetch(`/receipts${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<Receipt[]>;
}

export async function fetchReceiptBySaleId(saleId: string): Promise<Receipt> {
  const res = await authedFetch(`/receipts/${saleId}`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<Receipt>;
}

export async function fetchSaleInvoice(saleId: string): Promise<SaleInvoiceResponse> {
  const res = await authedFetch(`/sales/${saleId}/invoice`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<SaleInvoiceResponse>;
}

export async function createSaleReturn(
  saleId: string,
  payload: CreateSaleReturnPayload,
  clientUuid: string,
): Promise<SaleReturnDispatchResult> {
  const res = await authedFetch(`/sales/${saleId}/returns`, {
    method: 'POST',
    headers: {
      'x-client-uuid': clientUuid,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res));
  }

  const data = (await res.json()) as DispatchResponse;

  if (data.status === 'REJECTED') {
    return {
      status: 'REJECTED',
      reason: data.reason ?? 'تم رفض العملية',
      idempotent: data.idempotent,
    };
  }

  if (data.status === 'APPLIED') {
    return { status: 'APPLIED', idempotent: data.idempotent };
  }

  return {
    status: 'REJECTED',
    reason: 'استجابة غير متوقعة من الخادم',
  };
}

export async function bulkImportProducts(
  items: BulkImportProductRow[],
): Promise<BulkImportResult> {
  const res = await authedFetch('/products/bulk-import', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<BulkImportResult>;
}

export async function fetchActivityLog(params: {
  userId?: string;
  from?: string;
  to?: string;
  eventType?: string;
  page?: number;
  limit?: number;
}): Promise<ActivityLogResponse> {
  const searchParams = new URLSearchParams();
  if (params.userId) searchParams.set('userId', params.userId);
  if (params.from) searchParams.set('from', params.from);
  if (params.to) searchParams.set('to', params.to);
  if (params.eventType) searchParams.set('eventType', params.eventType);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  const qs = searchParams.toString();
  const res = await authedFetch(`/activity-log${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<ActivityLogResponse>;
}

export async function fetchActivityLogUsers(): Promise<ActivityLogUser[]> {
  const res = await authedFetch('/activity-log/users');
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<ActivityLogUser[]>;
}

export async function fetchActivityLogEventTypes(): Promise<string[]> {
  const res = await authedFetch('/activity-log/event-types');
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<string[]>;
}
