"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const backup_service_1 = require("./backup.service");
const restore_backup_dto_1 = require("./dto/restore-backup.dto");
const update_backup_schedule_dto_1 = require("./dto/update-backup-schedule.dto");
let BackupController = class BackupController {
    backupService;
    constructor(backupService) {
        this.backupService = backupService;
    }
    async download(res) {
        const payload = await this.backupService.exportBackup();
        const filename = this.backupService.formatBackupFilename(new Date(payload.exportedAt));
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify(payload, null, 2));
    }
    dryRun(backupData) {
        return this.backupService.dryRun(backupData);
    }
    restore(req, dto) {
        return this.backupService.restore(req.user.userId, dto.confirmPassword, dto.backupData);
    }
    getSchedule() {
        return this.backupService.getSchedule();
    }
    updateSchedule(dto) {
        return this.backupService.updateSchedule(dto);
    }
};
exports.BackupController = BackupController;
__decorate([
    (0, common_1.Get)('download'),
    __param(0, (0, common_1.Res)({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BackupController.prototype, "download", null);
__decorate([
    (0, common_1.Post)('restore/dry-run'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BackupController.prototype, "dryRun", null);
__decorate([
    (0, common_1.Post)('restore'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, restore_backup_dto_1.RestoreBackupDto]),
    __metadata("design:returntype", void 0)
], BackupController.prototype, "restore", null);
__decorate([
    (0, common_1.Get)('schedule'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BackupController.prototype, "getSchedule", null);
__decorate([
    (0, common_1.Patch)('schedule'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_backup_schedule_dto_1.UpdateBackupScheduleDto]),
    __metadata("design:returntype", void 0)
], BackupController.prototype, "updateSchedule", null);
exports.BackupController = BackupController = __decorate([
    (0, common_1.Controller)('backup'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, transform: true })),
    __metadata("design:paramtypes", [backup_service_1.BackupService])
], BackupController);
//# sourceMappingURL=backup.controller.js.map