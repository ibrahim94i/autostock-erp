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
exports.AccountingController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const idempotency_interceptor_1 = require("../common/interceptors/idempotency.interceptor");
const accounting_service_1 = require("./accounting.service");
const create_payment_dto_1 = require("./dto/create-payment.dto");
const pl_query_dto_1 = require("./dto/pl-query.dto");
let AccountingController = class AccountingController {
    accountingService;
    constructor(accountingService) {
        this.accountingService = accountingService;
    }
    createPayment(dto, req) {
        return this.accountingService.createPayment(dto, req.user.userId);
    }
    getProfitReport(query) {
        return this.accountingService.getProfitAndLoss(new Date(query.from), new Date(query.to));
    }
    listAccounts() {
        return this.accountingService.listAccounts();
    }
};
exports.AccountingController = AccountingController;
__decorate([
    (0, common_1.Post)('payments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.UseInterceptors)(idempotency_interceptor_1.IdempotencyInterceptor),
    (0, roles_decorator_1.Roles)('accountant', 'admin', 'cashier'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_payment_dto_1.CreatePaymentDto, Object]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "createPayment", null);
__decorate([
    (0, common_1.Get)('reports/profit'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('accountant', 'admin'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pl_query_dto_1.PlQueryDto]),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "getProfitReport", null);
__decorate([
    (0, common_1.Get)('accounts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('accountant', 'admin'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AccountingController.prototype, "listAccounts", null);
exports.AccountingController = AccountingController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, transform: true })),
    __metadata("design:paramtypes", [accounting_service_1.AccountingService])
], AccountingController);
//# sourceMappingURL=accounting.controller.js.map