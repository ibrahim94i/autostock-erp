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
exports.ReportsController = exports.DashboardReportsController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const reports_query_dto_1 = require("./dto/reports-query.dto");
const reports_service_1 = require("./reports.service");
let DashboardReportsController = class DashboardReportsController {
    reportsService;
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    getSummary() {
        return this.reportsService.getSummary();
    }
};
exports.DashboardReportsController = DashboardReportsController;
__decorate([
    (0, common_1.Get)('summary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DashboardReportsController.prototype, "getSummary", null);
exports.DashboardReportsController = DashboardReportsController = __decorate([
    (0, common_1.Controller)('dashboard'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], DashboardReportsController);
let ReportsController = class ReportsController {
    reportsService;
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    getDailyReport(query) {
        return this.reportsService.getDailyReport(query.date);
    }
    getSalesReport(query) {
        return this.reportsService.getSalesReport(query.from, query.to, query.groupBy ?? 'day');
    }
    getProductsReport(query) {
        return this.reportsService.getProductsReport(query.from, query.to);
    }
    getCustomersReport(query) {
        return this.reportsService.getCustomersReport(query.from, query.to);
    }
    getInventoryMovementReport(query) {
        return this.reportsService.getInventoryMovementReport(query.from, query.to);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('daily'),
    (0, roles_decorator_1.Roles)('admin', 'accountant'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_query_dto_1.DailyReportQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getDailyReport", null);
__decorate([
    (0, common_1.Get)('sales'),
    (0, roles_decorator_1.Roles)('admin', 'accountant'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_query_dto_1.SalesReportQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getSalesReport", null);
__decorate([
    (0, common_1.Get)('products'),
    (0, roles_decorator_1.Roles)('admin', 'accountant'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_query_dto_1.DateRangeQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getProductsReport", null);
__decorate([
    (0, common_1.Get)('customers'),
    (0, roles_decorator_1.Roles)('admin', 'accountant'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_query_dto_1.DateRangeQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getCustomersReport", null);
__decorate([
    (0, common_1.Get)('inventory-movement'),
    (0, roles_decorator_1.Roles)('admin', 'accountant', 'warehouse'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_query_dto_1.DateRangeQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getInventoryMovementReport", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('reports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, transform: true })),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map