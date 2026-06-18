export interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  costPrice: string | number;
  averageCost?: string | number;
  retailPrice: string | number;
  wholesalePrice: string | number;
  minStockAlert: number;
  unit: string;
  unitsPerCarton: number;
  categoryId: string;
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductsQueryParams {
  search?: string;
  page?: number;
  limit?: number;
  categoryId?: string;
}

export interface ProductFormValues {
  sku: string;
  name: string;
  costPrice: string;
  retailPrice: string;
  wholesalePrice: string;
  minStockAlert: string;
  unit: string;
  unitsPerCarton: string;
  categoryId: string;
}

export interface CreateProductPayload {
  sku: string;
  name: string;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  minStockAlert: number;
  unit: string;
  unitsPerCarton: number;
  categoryId: string;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  type: string;
}

export interface CustomerBalanceResponse {
  customerId: string;
  balance: string | number;
}

export interface CreateCustomerPayload {
  name: string;
  phone?: string;
  type: 'retail' | 'wholesale' | 'both';
}

export interface CustomerStatementLine {
  debit: string | number;
  credit: string | number;
  accountId: string;
  entryId: string;
  entryDate: string;
}

export interface PaginatedCustomers {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StockBalanceItem {
  productId: string;
  locationId: string;
  quantity: string | number;
  product?: {
    id: string;
    sku: string;
    name: string;
    minStockAlert: number;
    unitsPerCarton?: number;
  };
  location?: {
    id: string;
    zone: string;
    shelf: string;
    code: string;
  };
}

export interface StockBalancesQueryParams {
  productId?: string;
  locationId?: string;
  page?: number;
  limit?: number;
}

export interface Location {
  id: string;
  zone: string;
  shelf: string;
  code: string;
}

export interface LowStockAlert {
  productId: string;
  locationId: string;
  quantity: string | number;
  minStockAlert: number;
  product: {
    id: string;
    sku: string;
    name: string;
  };
  location: {
    id: string;
    zone: string;
    shelf: string;
    code: string;
  };
}

export interface ReconcileStockItemPayload {
  productId: string;
  locationId: string;
  actualQty: number;
}

export interface ReconcileStockPayload {
  items: ReconcileStockItemPayload[];
  reason: string;
}

export type ReconcileDispatchResult =
  | { status: 'APPLIED'; idempotent?: boolean }
  | { status: 'REJECTED'; reason: string; idempotent?: boolean };

export interface PaginatedStockBalances {
  items: StockBalanceItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateSaleItemPayload {
  productId: string;
  locationId: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  qtyUnit?: 'piece' | 'carton';
  displayQty?: number;
}

export interface CreateSalePayload {
  customerId?: string;
  type: 'retail' | 'wholesale';
  paymentType: 'cash' | 'debt';
  items: CreateSaleItemPayload[];
}

export type SaleDispatchResult =
  | { status: 'APPLIED'; saleId?: string; idempotent?: boolean }
  | { status: 'REJECTED'; reason: string; idempotent?: boolean };

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
}

export interface PaginatedSuppliers {
  items: Supplier[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PurchaseOrderItem {
  id: string;
  poId: string;
  productId: string;
  qty: string | number;
  unitCost: string | number;
  product?: Product;
}

export interface PurchaseOrder {
  id: string;
  clientUuid: string;
  supplierId: string;
  status: string;
  createdBy: string;
  createdAt: string;
  supplier?: Supplier;
  items: PurchaseOrderItem[];
}

export interface PaginatedPurchaseOrders {
  items: PurchaseOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PurchaseOrdersQueryParams {
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreatePurchaseOrderItemPayload {
  productId: string;
  qty: number;
  unitCost: number;
}

export interface CreatePurchaseOrderPayload {
  supplierId: string;
  items: CreatePurchaseOrderItemPayload[];
}

export interface ReceivePurchaseOrderPayload {
  locationId: string;
}

export type ReceivePoDispatchResult =
  | { status: 'APPLIED'; idempotent?: boolean }
  | { status: 'REJECTED'; reason: string; idempotent?: boolean };

export interface SupplierBalanceResponse {
  supplierId: string;
  balance: string | number;
}

export interface CreateSupplierPayload {
  name: string;
  phone?: string;
}

export interface CreatePaymentPayload {
  partyType: 'SUPPLIER' | 'CUSTOMER';
  partyId: string;
  amount: number;
  direction: 'IN' | 'OUT';
  method: 'cash';
}

export type PaymentDispatchResult =
  | { status: 'APPLIED'; idempotent?: boolean }
  | { status: 'REJECTED'; reason: string; idempotent?: boolean };

export interface DashboardMetric {
  value: unknown;
  period: string;
  computedAt: string;
}

export interface DashboardSummary {
  sales_today?: DashboardMetric;
  net_profit_today?: DashboardMetric;
  total_customer_debt?: DashboardMetric;
  low_stock_count?: DashboardMetric;
  top_products?: DashboardMetric;
}

export interface TopProductEntry {
  productId: string;
  productName: string;
  totalQty: number;
}

export interface CompanySettings {
  id: string;
  companyName: string;
  companyPhone: string | null;
  companyAddress: string | null;
  companyLogo: string | null;
  taxNumber: string | null;
  currency: string;
  receiptSize: string;
  defaultTaxRate: number;
  defaultReceiptFooter: string;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  telegramDailyTime: string;
  telegramEnabled: boolean;
  updatedAt: string;
}

export interface UpdateSettingsPayload {
  companyName: string;
  companyPhone?: string;
  companyAddress?: string;
  companyLogo?: string;
  taxNumber?: string;
  currency?: string;
  receiptSize?: string;
  defaultTaxRate?: number;
  defaultReceiptFooter?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramDailyTime?: string;
  telegramEnabled?: boolean;
}

export interface BackupDryRunResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export interface BackupRestoreResult {
  success: boolean;
  tablesRestored: string[];
  recordsRestored: number;
}

export interface BackupScheduleConfig {
  enabled: boolean;
  intervalHours: number;
  keepLastN: number;
  lastAutoBackupAt?: string | null;
}

export interface UpdateBackupSchedulePayload {
  enabled?: boolean;
  intervalHours?: number;
  keepLastN?: number;
}

export interface BackupPayload {
  exportedAt: string;
  schemaVersion: string;
  checksum: string;
  recordCounts: Record<string, number>;
  tables: Record<string, unknown[]>;
}

export interface DailyReport {
  date: string;
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  netProfit: number;
  totalReturns: number;
  totalNewDebt: number;
  paymentsReceived: number;
  salesCount: number;
  invoices: Array<{
    saleId: string;
    invoiceNumber: string;
    customerName: string;
    amount: number;
    paymentType: 'cash' | 'debt';
    paymentLabel: string;
  }>;
  topProducts: Array<{ productId: string; name: string; qty: number; revenue: number }>;
  paymentBreakdown: { cash: number; debt: number };
}

export interface SalesPeriodReportRow {
  period: string;
  totalSales: number;
  netProfit: number;
  salesCount: number;
}

export interface ProductReportRow {
  productId: string;
  name: string;
  unitsPerCarton: number;
  qtySold: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface CustomerReportRow {
  customerId: string;
  name: string;
  totalPurchases: number;
  totalPaid: number;
  balance: number;
}

export interface InventoryMovementRow {
  productId: string;
  name: string;
  openingQty: number;
  inQty: number;
  outQty: number;
  closingQty: number;
}

export interface CashTransaction {
  id: string;
  registerId: string;
  type: 'sale' | 'payment_in' | 'payment_out' | string;
  amount: string | number;
  description: string | null;
  reference: string | null;
  createdBy: string;
  createdAt: string;
}

export interface CashRegister {
  id: string;
  date: string;
  openingBalance: string | number;
  closingBalance: string | number | null;
  actualBalance: string | number | null;
  difference: string | number | null;
  status: 'open' | 'closed' | string;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  transactions?: CashTransaction[];
}

export interface CashRegisterSummary {
  totalIn: string | number;
  totalOut: string | number;
  expectedBalance: string | number;
}

export interface CashTodayResponse {
  register: CashRegister | null;
  summary: CashRegisterSummary | null;
  suggestedOpeningBalance?: string | number | null;
}

export interface CashHistoryEntry extends CashRegister {
  summary: CashRegisterSummary;
}

export interface OpenCashRegisterPayload {
  openingBalance: number;
}

export interface CloseCashRegisterPayload {
  actualBalance: number;
  notes?: string;
}

export interface CreateCashDepositPayload {
  amount: number;
  source?: string;
  description?: string;
  clientUuid: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  clientUuid: string;
  date: string;
  amount: string | number;
  categoryId: string;
  category: ExpenseCategory;
  description: string | null;
  createdBy: string;
  createdAt: string;
}

export interface ExpensesListResponse {
  items: Expense[];
  total: string;
}

export interface CreateExpensePayload {
  date: string;
  amount: number;
  categoryId: string;
  description?: string;
  clientUuid: string;
}

export interface CreateExpenseCategoryPayload {
  name: string;
}

export interface Receipt {
  id: string;
  saleId: string;
  invoiceNumber: string;
  customerName: string | null;
  totalAmount: string | number;
  printedAt: string;
  printCount: number;
  createdBy: string;
}

export interface LogReceiptPayload {
  saleId: string;
  invoiceNumber?: string;
  customerName?: string;
  totalAmount: number;
}

export interface SaleInvoiceResponse {
  sale: {
    id: string;
    type: string;
    paymentType: string;
    subtotal: string | number;
    createdAt: string;
    customerId: string | null;
    customer?: { name: string } | null;
  };
  items: Array<{
    id?: string;
    productId: string;
    qty: string | number;
    qtyUnit?: string;
    displayQty?: string | number;
    unitPrice: string | number;
    unitCost: string | number;
    product: { id: string; name: string; sku: string; unitsPerCarton?: number };
  }>;
  returns?: Array<{
    id: string;
    productId: string;
    qty: string | number;
    refundAmount: string | number;
    reason: string;
    product: { name: string; sku: string };
  }>;
  returnedByProduct?: Record<string, string>;
}

export interface CreateSaleReturnPayload {
  items: Array<{
    productId: string;
    locationId: string;
    qty: number;
    unitCost: number;
    qtyUnit?: 'piece' | 'carton';
    displayQty?: number;
  }>;
  refundMethod: 'cash' | 'credit';
  reason: string;
  refundAmount: number;
}

export interface SaleReturnDispatchResult {
  status: 'APPLIED' | 'REJECTED';
  reason?: string;
  idempotent?: boolean;
}

export interface BulkImportProductRow {
  sku?: string;
  name: string;
  categoryName: string;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  minStockAlert?: number;
  unit: string;
  unitsPerCarton?: number;
}

export interface BulkImportResult {
  imported: number;
  skipped: Array<{ row: number; sku: string; reason: string }>;
  createdCategories: string[];
}

export interface ActivityLogEntry {
  id: string;
  eventType: string;
  status: string;
  occurredAt: string;
  appliedAt: string | null;
  createdBy: string;
  user: { id: string; name: string; username: string } | null;
  payload: unknown;
  entity: { type: string; id: string | null; label: string | null };
}

export interface ActivityLogResponse {
  items: ActivityLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActivityLogUser {
  id: string;
  name: string;
  username: string;
}
