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
exports.ReceiptsController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const log_receipt_dto_1 = require("./dto/log-receipt.dto");
const receipts_query_dto_1 = require("./dto/receipts-query.dto");
const receipts_service_1 = require("./receipts.service");
let ReceiptsController = class ReceiptsController {
    receiptsService;
    constructor(receiptsService) {
        this.receiptsService = receiptsService;
    }
    log(dto, req) {
        return this.receiptsService.log(dto, req.user.userId);
    }
    findAll(query) {
        return this.receiptsService.findAll(query);
    }
    getNextNumber() {
        return this.receiptsService.getNextNumber();
    }
    findBySaleId(saleId) {
        return this.receiptsService.findBySaleId(saleId);
    }
};
exports.ReceiptsController = ReceiptsController;
__decorate([
    (0, common_1.Post)('log'),
    (0, roles_decorator_1.Roles)('admin', 'cashier'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [log_receipt_dto_1.LogReceiptDto, Object]),
    __metadata("design:returntype", void 0)
], ReceiptsController.prototype, "log", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('admin', 'cashier', 'accountant'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [receipts_query_dto_1.ReceiptsQueryDto]),
    __metadata("design:returntype", void 0)
], ReceiptsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('next-number'),
    (0, roles_decorator_1.Roles)('admin', 'cashier', 'accountant'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReceiptsController.prototype, "getNextNumber", null);
__decorate([
    (0, common_1.Get)(':saleId'),
    (0, roles_decorator_1.Roles)('admin', 'cashier', 'accountant'),
    __param(0, (0, common_1.Param)('saleId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReceiptsController.prototype, "findBySaleId", null);
exports.ReceiptsController = ReceiptsController = __decorate([
    (0, common_1.Controller)('receipts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, transform: true })),
    __metadata("design:paramtypes", [receipts_service_1.ReceiptsService])
], ReceiptsController);
//# sourceMappingURL=receipts.controller.js.map