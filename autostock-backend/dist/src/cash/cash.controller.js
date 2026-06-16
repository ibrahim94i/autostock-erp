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
exports.CashController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const cash_service_1 = require("./cash.service");
const cash_history_query_dto_1 = require("./dto/cash-history-query.dto");
const close_cash_register_dto_1 = require("./dto/close-cash-register.dto");
const open_cash_register_dto_1 = require("./dto/open-cash-register.dto");
let CashController = class CashController {
    cashService;
    constructor(cashService) {
        this.cashService = cashService;
    }
    open(dto, req) {
        return this.cashService.open(dto, req.user.userId);
    }
    getToday() {
        return this.cashService.getToday();
    }
    close(dto, req) {
        return this.cashService.close(dto, req.user.userId);
    }
    getHistory(query) {
        return this.cashService.getHistory(query);
    }
};
exports.CashController = CashController;
__decorate([
    (0, common_1.Post)('open'),
    (0, roles_decorator_1.Roles)('admin', 'cashier', 'accountant'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [open_cash_register_dto_1.OpenCashRegisterDto, Object]),
    __metadata("design:returntype", void 0)
], CashController.prototype, "open", null);
__decorate([
    (0, common_1.Get)('today'),
    (0, roles_decorator_1.Roles)('admin', 'cashier', 'accountant'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CashController.prototype, "getToday", null);
__decorate([
    (0, common_1.Post)('close'),
    (0, roles_decorator_1.Roles)('admin', 'cashier', 'accountant'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [close_cash_register_dto_1.CloseCashRegisterDto, Object]),
    __metadata("design:returntype", void 0)
], CashController.prototype, "close", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, roles_decorator_1.Roles)('admin', 'cashier', 'accountant'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cash_history_query_dto_1.CashHistoryQueryDto]),
    __metadata("design:returntype", void 0)
], CashController.prototype, "getHistory", null);
exports.CashController = CashController = __decorate([
    (0, common_1.Controller)('cash'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, transform: true })),
    __metadata("design:paramtypes", [cash_service_1.CashService])
], CashController);
//# sourceMappingURL=cash.controller.js.map