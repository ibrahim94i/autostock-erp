import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  BACKUP_DELETE_STEPS,
  BACKUP_INSERT_ORDER,
  BACKUP_SCHEMA_VERSION,
  BACKUP_TABLE_KEYS,
  DEFAULT_BACKUP_SCHEDULE,
  type BackupDryRunResult,
  type BackupPayload,
  type BackupRecordCounts,
  type BackupRestoreResult,
  type BackupScheduleConfig,
  type BackupTableKey,
  type BackupTables,
} from './backup.types';

const BACKUPS_DIR = path.join(process.cwd(), 'backups');
const SCHEDULE_FILE = path.join(BACKUPS_DIR, 'schedule.json');
const AUTO_BACKUP_PREFIX = 'autostock-backup-';

type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'
>;

type FkRule = {
  table: BackupTableKey;
  field: string;
  refTable: BackupTableKey;
  optional?: boolean;
};

const FK_RULES: FkRule[] = [
  { table: 'categories', field: 'parentId', refTable: 'categories', optional: true },
  { table: 'products', field: 'categoryId', refTable: 'categories' },
  { table: 'users', field: 'roleId', refTable: 'roles' },
  { table: 'sales', field: 'customerId', refTable: 'customers', optional: true },
  { table: 'saleItems', field: 'saleId', refTable: 'sales' },
  { table: 'saleItems', field: 'productId', refTable: 'products' },
  { table: 'purchaseOrders', field: 'supplierId', refTable: 'suppliers' },
  { table: 'purchaseItems', field: 'poId', refTable: 'purchaseOrders' },
  { table: 'purchaseItems', field: 'productId', refTable: 'products' },
  { table: 'returns', field: 'saleId', refTable: 'sales' },
  { table: 'returns', field: 'productId', refTable: 'products' },
  { table: 'stockMovements', field: 'eventId', refTable: 'eventLog' },
  { table: 'stockMovements', field: 'productId', refTable: 'products' },
  { table: 'stockMovements', field: 'locationId', refTable: 'locations' },
  { table: 'journalEntries', field: 'eventId', refTable: 'eventLog' },
  { table: 'journalLines', field: 'entryId', refTable: 'journalEntries' },
];

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.ensureBackupsDir();
  }

  async exportBackup(): Promise<BackupPayload> {
    const tables = await this.fetchAllTables();
    const recordCounts = this.buildRecordCounts(tables);
    const checksum = this.computeChecksum(tables);

    return {
      exportedAt: new Date().toISOString(),
      schemaVersion: BACKUP_SCHEMA_VERSION,
      checksum,
      recordCounts,
      tables,
    };
  }

  formatBackupFilename(date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${AUTO_BACKUP_PREFIX}${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}.json`;
  }

  async saveAutoBackupFile(payload: BackupPayload): Promise<string> {
    this.ensureBackupsDir();
    const filename = this.formatBackupFilename(new Date(payload.exportedAt));
    const filePath = path.join(BACKUPS_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
    return filePath;
  }

  pruneAutoBackups(keepLastN: number): void {
    this.ensureBackupsDir();
    const files = fs
      .readdirSync(BACKUPS_DIR)
      .filter((f) => f.startsWith(AUTO_BACKUP_PREFIX) && f.endsWith('.json'))
      .map((f) => ({
        name: f,
        mtime: fs.statSync(path.join(BACKUPS_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    for (const file of files.slice(keepLastN)) {
      fs.unlinkSync(path.join(BACKUPS_DIR, file.name));
      this.logger.log(`Removed old auto-backup: ${file.name}`);
    }
  }

  getSchedule(): BackupScheduleConfig {
    this.ensureBackupsDir();
    if (!fs.existsSync(SCHEDULE_FILE)) {
      return { ...DEFAULT_BACKUP_SCHEDULE };
    }
    try {
      const raw = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8')) as BackupScheduleConfig;
      return {
        enabled: raw.enabled ?? DEFAULT_BACKUP_SCHEDULE.enabled,
        intervalHours: raw.intervalHours ?? DEFAULT_BACKUP_SCHEDULE.intervalHours,
        keepLastN: raw.keepLastN ?? DEFAULT_BACKUP_SCHEDULE.keepLastN,
        lastAutoBackupAt: raw.lastAutoBackupAt ?? null,
      };
    } catch {
      return { ...DEFAULT_BACKUP_SCHEDULE };
    }
  }

  updateSchedule(patch: Partial<BackupScheduleConfig>): BackupScheduleConfig {
    const current = this.getSchedule();
    const next: BackupScheduleConfig = {
      enabled: patch.enabled ?? current.enabled,
      intervalHours: patch.intervalHours ?? current.intervalHours,
      keepLastN: patch.keepLastN ?? current.keepLastN,
      lastAutoBackupAt: current.lastAutoBackupAt ?? null,
    };

    if (next.intervalHours < 1) {
      throw new BadRequestException('intervalHours must be at least 1');
    }
    if (next.keepLastN < 1) {
      throw new BadRequestException('keepLastN must be at least 1');
    }

    this.ensureBackupsDir();
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(next, null, 2), 'utf8');
    return next;
  }

  markAutoBackupRun(iso: string): void {
    const schedule = this.getSchedule();
    schedule.lastAutoBackupAt = iso;
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2), 'utf8');
  }

  shouldRunAutoBackup(): boolean {
    const schedule = this.getSchedule();
    if (!schedule.enabled) return false;

    if (!schedule.lastAutoBackupAt) return true;

    const elapsedMs = Date.now() - new Date(schedule.lastAutoBackupAt).getTime();
    return elapsedMs >= schedule.intervalHours * 60 * 60 * 1000;
  }

  async runAutoBackupIfDue(): Promise<void> {
    if (!this.shouldRunAutoBackup()) return;

    try {
      const payload = await this.exportBackup();
      await this.saveAutoBackupFile(payload);
      this.pruneAutoBackups(this.getSchedule().keepLastN);
      this.markAutoBackupRun(payload.exportedAt);
      this.logger.log('Scheduled auto-backup completed');
    } catch (error) {
      this.logger.error('Scheduled auto-backup failed', error);
    }
  }

  async dryRun(raw: unknown): Promise<BackupDryRunResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    const payload = this.parseBackupPayload(raw, errors);
    if (!payload || errors.length > 0) {
      return { valid: false, warnings, errors };
    }

    if (payload.schemaVersion !== BACKUP_SCHEMA_VERSION) {
      errors.push(
        `إصدار المخطط غير متوافق: ${payload.schemaVersion} (المطلوب ${BACKUP_SCHEMA_VERSION})`,
      );
    }

    const expectedChecksum = this.computeChecksum(payload.tables);
    if (payload.checksum !== expectedChecksum) {
      errors.push('checksum غير صحيح — قد يكون الملف تالفاً أو معدّلاً');
    }

    for (const key of BACKUP_TABLE_KEYS) {
      const rows = payload.tables[key];
      if (!Array.isArray(rows)) {
        errors.push(`جدول "${key}" مفقود أو غير صالح`);
        continue;
      }

      const declared = payload.recordCounts[key];
      if (typeof declared !== 'number') {
        errors.push(`recordCounts.${key} مفقود`);
      } else if (declared !== rows.length) {
        errors.push(
          `recordCounts.${key} (${declared}) لا يطابق عدد السجلات الفعلي (${rows.length})`,
        );
      }

      if (rows.length > 100_000) {
        warnings.push(`جدول "${key}" يحتوي على ${rows.length} سجل — حجم كبير`);
      }
    }

    const totalRecords = BACKUP_TABLE_KEYS.reduce(
      (sum, key) => sum + (payload.tables[key]?.length ?? 0),
      0,
    );
    if (totalRecords === 0) {
      warnings.push('النسخة الاحتياطية لا تحتوي على أي سجلات');
    }

    this.validateForeignKeys(payload.tables, errors);

    const accountErrors = await this.validateJournalAccountRefs(payload.tables.journalLines);
    errors.push(...accountErrors);

    return { valid: errors.length === 0, warnings, errors };
  }

  async restore(
    userId: string,
    confirmPassword: string,
    raw: unknown,
  ): Promise<BackupRestoreResult> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('المستخدم غير موجود');
    }

    const passwordValid = await bcrypt.compare(confirmPassword, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('كلمة المرور غير صحيحة');
    }

    const dryRunResult = await this.dryRun(raw);
    if (!dryRunResult.valid) {
      throw new BadRequestException({
        message: 'فشل التحقق من النسخة الاحتياطية',
        errors: dryRunResult.errors,
      });
    }

    const payload = raw as BackupPayload;
    const tablesRestored: string[] = [];
    let recordsRestored = 0;

    await this.prisma.$transaction(
      async (tx) => {
        await this.deleteAllData(tx);

        for (const tableKey of BACKUP_INSERT_ORDER) {
          const rows = payload.tables[tableKey];
          if (!rows?.length) continue;

          const inserted = await this.insertTableRows(tx, tableKey, rows);
          if (inserted > 0) {
            tablesRestored.push(tableKey);
            recordsRestored += inserted;
          }
        }

        await this.resetEventLogSequence(tx);
        await this.rebuildDerivedViews(tx);
      },
      { timeout: 120_000 },
    );

    return { success: true, tablesRestored, recordsRestored };
  }

  private parseBackupPayload(raw: unknown, errors: string[]): BackupPayload | null {
    if (!raw || typeof raw !== 'object') {
      errors.push('صيغة JSON غير صالحة');
      return null;
    }

    const data = raw as Partial<BackupPayload>;
    if (!data.tables || typeof data.tables !== 'object') {
      errors.push('حقل tables مفقود');
      return null;
    }
    if (!data.schemaVersion || typeof data.schemaVersion !== 'string') {
      errors.push('حقل schemaVersion مفقود');
    }
    if (!data.checksum || typeof data.checksum !== 'string') {
      errors.push('حقل checksum مفقود');
    }
    if (!data.recordCounts || typeof data.recordCounts !== 'object') {
      errors.push('حقل recordCounts مفقود');
    }

    return data as BackupPayload;
  }

  private async fetchAllTables(): Promise<BackupTables> {
    const [
      categories,
      products,
      locations,
      suppliers,
      customers,
      users,
      roles,
      settings,
      purchaseOrders,
      purchaseItems,
      sales,
      saleItems,
      payments,
      returns,
      eventLog,
      stockMovements,
      journalEntries,
      journalLines,
    ] = await Promise.all([
      this.prisma.category.findMany(),
      this.prisma.product.findMany(),
      this.prisma.location.findMany(),
      this.prisma.supplier.findMany(),
      this.prisma.customer.findMany(),
      this.prisma.user.findMany(),
      this.prisma.role.findMany(),
      this.prisma.settings.findMany(),
      this.prisma.purchaseOrder.findMany(),
      this.prisma.purchaseItem.findMany(),
      this.prisma.sale.findMany(),
      this.prisma.saleItem.findMany(),
      this.prisma.payment.findMany(),
      this.prisma.return.findMany(),
      this.prisma.eventLog.findMany(),
      this.prisma.stockMovement.findMany(),
      this.prisma.journalEntry.findMany(),
      this.prisma.journalLine.findMany(),
    ]);

    return {
      categories: categories.map(serializeRow),
      products: products.map(serializeRow),
      locations: locations.map(serializeRow),
      suppliers: suppliers.map(serializeRow),
      customers: customers.map(serializeRow),
      users: users.map(serializeRow),
      roles: roles.map(serializeRow),
      settings: settings.map(serializeRow),
      purchaseOrders: purchaseOrders.map(serializeRow),
      purchaseItems: purchaseItems.map(serializeRow),
      sales: sales.map(serializeRow),
      saleItems: saleItems.map(serializeRow),
      payments: payments.map(serializeRow),
      returns: returns.map(serializeRow),
      eventLog: eventLog.map(serializeRow),
      stockMovements: stockMovements.map(serializeRow),
      journalEntries: journalEntries.map(serializeRow),
      journalLines: journalLines.map(serializeRow),
    };
  }

  private buildRecordCounts(tables: BackupTables): BackupRecordCounts {
    const counts = {} as BackupRecordCounts;
    for (const key of BACKUP_TABLE_KEYS) {
      counts[key] = tables[key].length;
    }
    return counts;
  }

  private computeChecksum(tables: BackupTables): string {
    const json = stableStringify(tables);
    return crypto.createHash('md5').update(json, 'utf8').digest('hex');
  }

  private validateForeignKeys(tables: BackupTables, errors: string[]): void {
    const idSets = {} as Record<BackupTableKey, Set<string>>;
    for (const key of BACKUP_TABLE_KEYS) {
      idSets[key] = new Set(
        (tables[key] ?? []).map((row) => String(row.id ?? '')).filter(Boolean),
      );
    }

    for (const rule of FK_RULES) {
      for (const row of tables[rule.table] ?? []) {
        const refId = row[rule.field];
        if (refId == null || refId === '') {
          if (!rule.optional) {
            errors.push(`${rule.table}.${rule.field}: مرجع FK مفقود`);
          }
          continue;
        }
        if (!idSets[rule.refTable].has(String(refId))) {
          errors.push(
            `${rule.table}.${rule.field}=${String(refId)} → ${rule.refTable}.id غير موجود`,
          );
        }
      }
    }
  }

  private async validateJournalAccountRefs(
    journalLines: Record<string, unknown>[],
  ): Promise<string[]> {
    const errors: string[] = [];
    if (!journalLines?.length) return errors;

    const accountIds = new Set(
      (await this.prisma.account.findMany({ select: { id: true } })).map((a) => a.id),
    );

    for (const line of journalLines) {
      const accountId = line.accountId;
      if (!accountId) {
        errors.push('journalLines.accountId: مرجع FK مفقود');
        continue;
      }
      if (!accountIds.has(String(accountId))) {
        errors.push(
          `journalLines.accountId=${String(accountId)} → Account.id غير موجود في قاعدة البيانات`,
        );
      }
    }

    return errors;
  }

  private async deleteAllData(tx: TxClient): Promise<void> {
    for (const step of BACKUP_DELETE_STEPS) {
      await this.deleteTable(tx, step);
    }
  }

  private async deleteTable(tx: TxClient, table: string): Promise<void> {
    switch (table) {
      case 'journalLines':
        await tx.journalLine.deleteMany();
        break;
      case 'journalEntries':
        await tx.journalEntry.deleteMany();
        break;
      case 'stockBalanceView':
        await tx.stockBalanceView.deleteMany();
        break;
      case 'customerBalanceView':
        await tx.customerBalanceView.deleteMany();
        break;
      case 'supplierBalanceView':
        await tx.supplierBalanceView.deleteMany();
        break;
      case 'dashboardAggregate':
        await tx.dashboardAggregate.deleteMany();
        break;
      case 'stockMovements':
        await tx.stockMovement.deleteMany();
        break;
      case 'saleItems':
        await tx.saleItem.deleteMany();
        break;
      case 'purchaseItems':
        await tx.purchaseItem.deleteMany();
        break;
      case 'returns':
        await tx.return.deleteMany();
        break;
      case 'payments':
        await tx.payment.deleteMany();
        break;
      case 'sales':
        await tx.sale.deleteMany();
        break;
      case 'purchaseOrders':
        await tx.purchaseOrder.deleteMany();
        break;
      case 'eventLog':
        await tx.eventLog.deleteMany();
        break;
      case 'products':
        await tx.product.deleteMany();
        break;
      case 'users':
        await tx.user.deleteMany();
        break;
      case 'settings':
        await tx.settings.deleteMany();
        break;
      case 'customers':
        await tx.customer.deleteMany();
        break;
      case 'suppliers':
        await tx.supplier.deleteMany();
        break;
      case 'locations':
        await tx.location.deleteMany();
        break;
      case 'categories':
        await tx.category.deleteMany();
        break;
      case 'roles':
        await tx.role.deleteMany();
        break;
      default:
        break;
    }
  }

  private async insertTableRows(
    tx: TxClient,
    tableKey: BackupTableKey,
    rows: Record<string, unknown>[],
  ): Promise<number> {
    if (tableKey === 'categories') {
      return this.insertCategories(tx, rows);
    }

    const data = rows.map(deserializeRow);
    const model = tableKeyToModel(tableKey);
    await (tx as unknown as Record<string, { createMany: (args: { data: unknown[] }) => Promise<{ count: number }> }>)[
      model
    ].createMany({ data });
    return rows.length;
  }

  private async insertCategories(
    tx: TxClient,
    rows: Record<string, unknown>[],
  ): Promise<number> {
    const remaining = [...rows];
    const inserted = new Set<string>();
    let safety = remaining.length * 2 + 1;

    while (remaining.length > 0 && safety-- > 0) {
      const batch: Record<string, unknown>[] = [];
      for (let i = remaining.length - 1; i >= 0; i--) {
        const row = remaining[i];
        const parentId = row.parentId as string | null | undefined;
        if (!parentId || inserted.has(String(parentId))) {
          batch.push(deserializeRow(row));
          inserted.add(String(row.id));
          remaining.splice(i, 1);
        }
      }

      if (batch.length === 0) {
        throw new BadRequestException('تعذر ترتيب categories — مراجع parentId دائرية أو مفقودة');
      }

      await tx.category.createMany({ data: batch as Prisma.CategoryCreateManyInput[] });
    }

    return rows.length;
  }

  private async resetEventLogSequence(tx: TxClient): Promise<void> {
    await tx.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"EventLog"', 'serverSeq'),
        COALESCE((SELECT MAX("serverSeq") FROM "EventLog"), 1)
      )
    `);
  }

  private async rebuildDerivedViews(tx: TxClient): Promise<void> {
    await this.rebuildStockBalances(tx);
    await this.rebuildPartyBalances(tx);
  }

  private async rebuildStockBalances(tx: TxClient): Promise<void> {
    const movements = await tx.stockMovement.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const balances = new Map<string, { qty: Prisma.Decimal; lastId: string }>();

    for (const movement of movements) {
      const key = `${movement.productId}:${movement.locationId}`;
      const current = balances.get(key) ?? {
        qty: new Prisma.Decimal(0),
        lastId: movement.id,
      };
      const delta =
        movement.direction.toUpperCase() === 'IN'
          ? movement.quantity
          : movement.quantity.neg();
      current.qty = current.qty.plus(delta);
      current.lastId = movement.id;
      balances.set(key, current);
    }

    const now = new Date();
    for (const [key, { qty, lastId }] of balances) {
      if (qty.isZero()) continue;
      const [productId, locationId] = key.split(':');
      await tx.stockBalanceView.create({
        data: {
          productId,
          locationId,
          quantity: qty,
          lastMovementId: lastId,
          updatedAt: now,
        },
      });
    }
  }

  private async rebuildPartyBalances(tx: TxClient): Promise<void> {
    const accounts = await tx.account.findMany();
    const accountById = new Map(accounts.map((a) => [a.id, a]));

    const lines = await tx.journalLine.findMany({
      include: { entry: true },
      orderBy: [{ entry: { entryDate: 'asc' } }, { id: 'asc' }],
    });

    const customerBalances = new Map<string, { balance: Prisma.Decimal; lastEntryId: string }>();
    const supplierBalances = new Map<string, { balance: Prisma.Decimal; lastEntryId: string }>();
    const now = new Date();

    for (const line of lines) {
      if (!line.partyType || !line.partyId) continue;
      const account = accountById.get(line.accountId);
      if (!account) continue;

      if (line.partyType === 'CUSTOMER' && account.name === 'AccountsReceivable') {
        const existing = customerBalances.get(line.partyId) ?? {
          balance: new Prisma.Decimal(0),
          lastEntryId: line.entryId,
        };
        existing.balance = existing.balance.plus(line.debit).minus(line.credit);
        existing.lastEntryId = line.entryId;
        customerBalances.set(line.partyId, existing);
      }

      if (line.partyType === 'SUPPLIER' && account.name === 'AccountsPayable') {
        const existing = supplierBalances.get(line.partyId) ?? {
          balance: new Prisma.Decimal(0),
          lastEntryId: line.entryId,
        };
        existing.balance = existing.balance.plus(line.credit).minus(line.debit);
        existing.lastEntryId = line.entryId;
        supplierBalances.set(line.partyId, existing);
      }
    }

    for (const [customerId, { balance, lastEntryId }] of customerBalances) {
      if (balance.isZero()) continue;
      await tx.customerBalanceView.create({
        data: { customerId, balance, lastEntryId, updatedAt: now },
      });
    }

    for (const [supplierId, { balance, lastEntryId }] of supplierBalances) {
      if (balance.isZero()) continue;
      await tx.supplierBalanceView.create({
        data: { supplierId, balance, lastEntryId, updatedAt: now },
      });
    }
  }

  private ensureBackupsDir(): void {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
  }
}

function serializeRow(row: object): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(row, (_key, value: unknown) => {
      if (value instanceof Prisma.Decimal) return value.toString();
      if (value instanceof Date) return value.toISOString();
      return value;
    }),
  ) as Record<string, unknown>;
}

function deserializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      out[key] = value;
      continue;
    }
    if (typeof value === 'string' && isIsoDateString(value)) {
      out[key] = new Date(value);
      continue;
    }
    out[key] = value;
  }
  return out;
}

function isIsoDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(value);
}

function tableKeyToModel(tableKey: BackupTableKey): string {
  const map: Record<BackupTableKey, string> = {
    roles: 'role',
    categories: 'category',
    locations: 'location',
    suppliers: 'supplier',
    customers: 'customer',
    users: 'user',
    settings: 'settings',
    products: 'product',
    eventLog: 'eventLog',
    sales: 'sale',
    purchaseOrders: 'purchaseOrder',
    payments: 'payment',
    saleItems: 'saleItem',
    purchaseItems: 'purchaseItem',
    returns: 'return',
    stockMovements: 'stockMovement',
    journalEntries: 'journalEntry',
    journalLines: 'journalLine',
  };
  return map[tableKey];
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}
