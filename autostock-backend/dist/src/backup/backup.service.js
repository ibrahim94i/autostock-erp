"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BackupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const prisma_service_1 = require("../common/prisma/prisma.service");
const backup_types_1 = require("./backup.types");
const BACKUPS_DIR = path.join(process.cwd(), 'backups');
const SCHEDULE_FILE = path.join(BACKUPS_DIR, 'schedule.json');
const AUTO_BACKUP_PREFIX = 'autostock-backup-';
const FK_RULES = [
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
let BackupService = BackupService_1 = class BackupService {
    prisma;
    logger = new common_1.Logger(BackupService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    onModuleInit() {
        this.ensureBackupsDir();
    }
    async exportBackup() {
        const tables = await this.fetchAllTables();
        const recordCounts = this.buildRecordCounts(tables);
        const checksum = this.computeChecksum(tables);
        return {
            exportedAt: new Date().toISOString(),
            schemaVersion: backup_types_1.BACKUP_SCHEMA_VERSION,
            checksum,
            recordCounts,
            tables,
        };
    }
    formatBackupFilename(date = new Date()) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${AUTO_BACKUP_PREFIX}${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}.json`;
    }
    async saveAutoBackupFile(payload) {
        this.ensureBackupsDir();
        const filename = this.formatBackupFilename(new Date(payload.exportedAt));
        const filePath = path.join(BACKUPS_DIR, filename);
        fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
        return filePath;
    }
    pruneAutoBackups(keepLastN) {
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
    getSchedule() {
        this.ensureBackupsDir();
        if (!fs.existsSync(SCHEDULE_FILE)) {
            return { ...backup_types_1.DEFAULT_BACKUP_SCHEDULE };
        }
        try {
            const raw = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
            return {
                enabled: raw.enabled ?? backup_types_1.DEFAULT_BACKUP_SCHEDULE.enabled,
                intervalHours: raw.intervalHours ?? backup_types_1.DEFAULT_BACKUP_SCHEDULE.intervalHours,
                keepLastN: raw.keepLastN ?? backup_types_1.DEFAULT_BACKUP_SCHEDULE.keepLastN,
                lastAutoBackupAt: raw.lastAutoBackupAt ?? null,
            };
        }
        catch {
            return { ...backup_types_1.DEFAULT_BACKUP_SCHEDULE };
        }
    }
    updateSchedule(patch) {
        const current = this.getSchedule();
        const next = {
            enabled: patch.enabled ?? current.enabled,
            intervalHours: patch.intervalHours ?? current.intervalHours,
            keepLastN: patch.keepLastN ?? current.keepLastN,
            lastAutoBackupAt: current.lastAutoBackupAt ?? null,
        };
        if (next.intervalHours < 1) {
            throw new common_1.BadRequestException('intervalHours must be at least 1');
        }
        if (next.keepLastN < 1) {
            throw new common_1.BadRequestException('keepLastN must be at least 1');
        }
        this.ensureBackupsDir();
        fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(next, null, 2), 'utf8');
        return next;
    }
    markAutoBackupRun(iso) {
        const schedule = this.getSchedule();
        schedule.lastAutoBackupAt = iso;
        fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedule, null, 2), 'utf8');
    }
    shouldRunAutoBackup() {
        const schedule = this.getSchedule();
        if (!schedule.enabled)
            return false;
        if (!schedule.lastAutoBackupAt)
            return true;
        const elapsedMs = Date.now() - new Date(schedule.lastAutoBackupAt).getTime();
        return elapsedMs >= schedule.intervalHours * 60 * 60 * 1000;
    }
    async runAutoBackupIfDue() {
        if (!this.shouldRunAutoBackup())
            return;
        try {
            const payload = await this.exportBackup();
            await this.saveAutoBackupFile(payload);
            this.pruneAutoBackups(this.getSchedule().keepLastN);
            this.markAutoBackupRun(payload.exportedAt);
            this.logger.log('Scheduled auto-backup completed');
        }
        catch (error) {
            this.logger.error('Scheduled auto-backup failed', error);
        }
    }
    async dryRun(raw) {
        const warnings = [];
        const errors = [];
        const payload = this.parseBackupPayload(raw, errors);
        if (!payload || errors.length > 0) {
            return { valid: false, warnings, errors };
        }
        if (payload.schemaVersion !== backup_types_1.BACKUP_SCHEMA_VERSION) {
            errors.push(`إصدار المخطط غير متوافق: ${payload.schemaVersion} (المطلوب ${backup_types_1.BACKUP_SCHEMA_VERSION})`);
        }
        const expectedChecksum = this.computeChecksum(payload.tables);
        if (payload.checksum !== expectedChecksum) {
            errors.push('checksum غير صحيح — قد يكون الملف تالفاً أو معدّلاً');
        }
        for (const key of backup_types_1.BACKUP_TABLE_KEYS) {
            const rows = payload.tables[key];
            if (!Array.isArray(rows)) {
                errors.push(`جدول "${key}" مفقود أو غير صالح`);
                continue;
            }
            const declared = payload.recordCounts[key];
            if (typeof declared !== 'number') {
                errors.push(`recordCounts.${key} مفقود`);
            }
            else if (declared !== rows.length) {
                errors.push(`recordCounts.${key} (${declared}) لا يطابق عدد السجلات الفعلي (${rows.length})`);
            }
            if (rows.length > 100_000) {
                warnings.push(`جدول "${key}" يحتوي على ${rows.length} سجل — حجم كبير`);
            }
        }
        const totalRecords = backup_types_1.BACKUP_TABLE_KEYS.reduce((sum, key) => sum + (payload.tables[key]?.length ?? 0), 0);
        if (totalRecords === 0) {
            warnings.push('النسخة الاحتياطية لا تحتوي على أي سجلات');
        }
        this.validateForeignKeys(payload.tables, errors);
        const accountErrors = await this.validateJournalAccountRefs(payload.tables.journalLines);
        errors.push(...accountErrors);
        return { valid: errors.length === 0, warnings, errors };
    }
    async restore(userId, confirmPassword, raw) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.UnauthorizedException('المستخدم غير موجود');
        }
        const passwordValid = await bcrypt.compare(confirmPassword, user.passwordHash);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('كلمة المرور غير صحيحة');
        }
        const dryRunResult = await this.dryRun(raw);
        if (!dryRunResult.valid) {
            throw new common_1.BadRequestException({
                message: 'فشل التحقق من النسخة الاحتياطية',
                errors: dryRunResult.errors,
            });
        }
        const payload = raw;
        const tablesRestored = [];
        let recordsRestored = 0;
        await this.prisma.$transaction(async (tx) => {
            await this.deleteAllData(tx);
            for (const tableKey of backup_types_1.BACKUP_INSERT_ORDER) {
                const rows = payload.tables[tableKey];
                if (!rows?.length)
                    continue;
                const inserted = await this.insertTableRows(tx, tableKey, rows);
                if (inserted > 0) {
                    tablesRestored.push(tableKey);
                    recordsRestored += inserted;
                }
            }
            await this.resetEventLogSequence(tx);
            await this.rebuildDerivedViews(tx);
        }, { timeout: 120_000 });
        return { success: true, tablesRestored, recordsRestored };
    }
    parseBackupPayload(raw, errors) {
        if (!raw || typeof raw !== 'object') {
            errors.push('صيغة JSON غير صالحة');
            return null;
        }
        const data = raw;
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
        return data;
    }
    async fetchAllTables() {
        const [categories, products, locations, suppliers, customers, users, roles, settings, purchaseOrders, purchaseItems, sales, saleItems, payments, returns, eventLog, stockMovements, journalEntries, journalLines,] = await Promise.all([
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
    buildRecordCounts(tables) {
        const counts = {};
        for (const key of backup_types_1.BACKUP_TABLE_KEYS) {
            counts[key] = tables[key].length;
        }
        return counts;
    }
    computeChecksum(tables) {
        const json = stableStringify(tables);
        return crypto.createHash('md5').update(json, 'utf8').digest('hex');
    }
    validateForeignKeys(tables, errors) {
        const idSets = {};
        for (const key of backup_types_1.BACKUP_TABLE_KEYS) {
            idSets[key] = new Set((tables[key] ?? []).map((row) => String(row.id ?? '')).filter(Boolean));
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
                    errors.push(`${rule.table}.${rule.field}=${String(refId)} → ${rule.refTable}.id غير موجود`);
                }
            }
        }
    }
    async validateJournalAccountRefs(journalLines) {
        const errors = [];
        if (!journalLines?.length)
            return errors;
        const accountIds = new Set((await this.prisma.account.findMany({ select: { id: true } })).map((a) => a.id));
        for (const line of journalLines) {
            const accountId = line.accountId;
            if (!accountId) {
                errors.push('journalLines.accountId: مرجع FK مفقود');
                continue;
            }
            if (!accountIds.has(String(accountId))) {
                errors.push(`journalLines.accountId=${String(accountId)} → Account.id غير موجود في قاعدة البيانات`);
            }
        }
        return errors;
    }
    async deleteAllData(tx) {
        for (const step of backup_types_1.BACKUP_DELETE_STEPS) {
            await this.deleteTable(tx, step);
        }
    }
    async deleteTable(tx, table) {
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
    async insertTableRows(tx, tableKey, rows) {
        if (tableKey === 'categories') {
            return this.insertCategories(tx, rows);
        }
        const data = rows.map(deserializeRow);
        const model = tableKeyToModel(tableKey);
        await tx[model].createMany({ data });
        return rows.length;
    }
    async insertCategories(tx, rows) {
        const remaining = [...rows];
        const inserted = new Set();
        let safety = remaining.length * 2 + 1;
        while (remaining.length > 0 && safety-- > 0) {
            const batch = [];
            for (let i = remaining.length - 1; i >= 0; i--) {
                const row = remaining[i];
                const parentId = row.parentId;
                if (!parentId || inserted.has(String(parentId))) {
                    batch.push(deserializeRow(row));
                    inserted.add(String(row.id));
                    remaining.splice(i, 1);
                }
            }
            if (batch.length === 0) {
                throw new common_1.BadRequestException('تعذر ترتيب categories — مراجع parentId دائرية أو مفقودة');
            }
            await tx.category.createMany({ data: batch });
        }
        return rows.length;
    }
    async resetEventLogSequence(tx) {
        await tx.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"EventLog"', 'serverSeq'),
        COALESCE((SELECT MAX("serverSeq") FROM "EventLog"), 1)
      )
    `);
    }
    async rebuildDerivedViews(tx) {
        await this.rebuildStockBalances(tx);
        await this.rebuildPartyBalances(tx);
    }
    async rebuildStockBalances(tx) {
        const movements = await tx.stockMovement.findMany({
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });
        const balances = new Map();
        for (const movement of movements) {
            const key = `${movement.productId}:${movement.locationId}`;
            const current = balances.get(key) ?? {
                qty: new client_1.Prisma.Decimal(0),
                lastId: movement.id,
            };
            const delta = movement.direction.toUpperCase() === 'IN'
                ? movement.quantity
                : movement.quantity.neg();
            current.qty = current.qty.plus(delta);
            current.lastId = movement.id;
            balances.set(key, current);
        }
        const now = new Date();
        for (const [key, { qty, lastId }] of balances) {
            if (qty.isZero())
                continue;
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
    async rebuildPartyBalances(tx) {
        const accounts = await tx.account.findMany();
        const accountById = new Map(accounts.map((a) => [a.id, a]));
        const lines = await tx.journalLine.findMany({
            include: { entry: true },
            orderBy: [{ entry: { entryDate: 'asc' } }, { id: 'asc' }],
        });
        const customerBalances = new Map();
        const supplierBalances = new Map();
        const now = new Date();
        for (const line of lines) {
            if (!line.partyType || !line.partyId)
                continue;
            const account = accountById.get(line.accountId);
            if (!account)
                continue;
            if (line.partyType === 'CUSTOMER' && account.name === 'AccountsReceivable') {
                const existing = customerBalances.get(line.partyId) ?? {
                    balance: new client_1.Prisma.Decimal(0),
                    lastEntryId: line.entryId,
                };
                existing.balance = existing.balance.plus(line.debit).minus(line.credit);
                existing.lastEntryId = line.entryId;
                customerBalances.set(line.partyId, existing);
            }
            if (line.partyType === 'SUPPLIER' && account.name === 'AccountsPayable') {
                const existing = supplierBalances.get(line.partyId) ?? {
                    balance: new client_1.Prisma.Decimal(0),
                    lastEntryId: line.entryId,
                };
                existing.balance = existing.balance.plus(line.credit).minus(line.debit);
                existing.lastEntryId = line.entryId;
                supplierBalances.set(line.partyId, existing);
            }
        }
        for (const [customerId, { balance, lastEntryId }] of customerBalances) {
            if (balance.isZero())
                continue;
            await tx.customerBalanceView.create({
                data: { customerId, balance, lastEntryId, updatedAt: now },
            });
        }
        for (const [supplierId, { balance, lastEntryId }] of supplierBalances) {
            if (balance.isZero())
                continue;
            await tx.supplierBalanceView.create({
                data: { supplierId, balance, lastEntryId, updatedAt: now },
            });
        }
    }
    ensureBackupsDir() {
        if (!fs.existsSync(BACKUPS_DIR)) {
            fs.mkdirSync(BACKUPS_DIR, { recursive: true });
        }
    }
};
exports.BackupService = BackupService;
exports.BackupService = BackupService = BackupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BackupService);
function serializeRow(row) {
    return JSON.parse(JSON.stringify(row, (_key, value) => {
        if (value instanceof client_1.Prisma.Decimal)
            return value.toString();
        if (value instanceof Date)
            return value.toISOString();
        return value;
    }));
}
function deserializeRow(row) {
    const out = {};
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
function isIsoDateString(value) {
    return /^\d{4}-\d{2}-\d{2}T/.test(value);
}
function tableKeyToModel(tableKey) {
    const map = {
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
function stableStringify(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }
    const obj = value;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}
//# sourceMappingURL=backup.service.js.map