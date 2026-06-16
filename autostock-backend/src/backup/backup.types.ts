export const BACKUP_SCHEMA_VERSION = '1.0';

export const BACKUP_TABLE_KEYS = [
  'categories',
  'products',
  'locations',
  'suppliers',
  'customers',
  'users',
  'roles',
  'settings',
  'purchaseOrders',
  'purchaseItems',
  'sales',
  'saleItems',
  'payments',
  'returns',
  'eventLog',
  'stockMovements',
  'journalEntries',
  'journalLines',
] as const;

export type BackupTableKey = (typeof BACKUP_TABLE_KEYS)[number];

export type BackupTables = Record<BackupTableKey, Record<string, unknown>[]>;

export type BackupRecordCounts = Record<BackupTableKey, number>;

export interface BackupPayload {
  exportedAt: string;
  schemaVersion: string;
  checksum: string;
  recordCounts: BackupRecordCounts;
  tables: BackupTables;
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

export const DEFAULT_BACKUP_SCHEDULE: BackupScheduleConfig = {
  enabled: true,
  intervalHours: 24,
  keepLastN: 7,
  lastAutoBackupAt: null,
};

/** Insert order respecting FK dependencies (independent tables first). */
export const BACKUP_INSERT_ORDER: BackupTableKey[] = [
  'roles',
  'categories',
  'locations',
  'suppliers',
  'customers',
  'settings',
  'users',
  'products',
  'eventLog',
  'sales',
  'purchaseOrders',
  'payments',
  'saleItems',
  'purchaseItems',
  'returns',
  'stockMovements',
  'journalEntries',
  'journalLines',
];

/** Delete order: dependents first. */
export const BACKUP_DELETE_STEPS = [
  'journalLines',
  'journalEntries',
  'stockBalanceView',
  'customerBalanceView',
  'supplierBalanceView',
  'dashboardAggregate',
  'stockMovements',
  'saleItems',
  'purchaseItems',
  'returns',
  'payments',
  'sales',
  'purchaseOrders',
  'eventLog',
  'products',
  'users',
  'settings',
  'customers',
  'suppliers',
  'locations',
  'categories',
  'roles',
] as const;
