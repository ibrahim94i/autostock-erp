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
exports.PurchasingController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const create_po_dto_1 = require("./dto/create-po.dto");
const create_supplier_dto_1 = require("./dto/create-supplier.dto");
const purchasing_service_1 = require("./purchasing.service");
const suppliers_service_1 = require("./suppliers.service");
let PurchasingController = class PurchasingController {
    suppliersService;
    purchasingService;
    constructor(suppliersService, purchasingService) {
        this.suppliersService = suppliersService;
        this.purchasingService = purchasingService;
    }
    findAllSuppliers(search, page, limit) {
        return this.suppliersService.findAll({
            search,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }
    createSupplier(dto) {
        return this.suppliersService.create(dto);
    }
    getSupplierBalance(id) {
        return this.suppliersService.getBalance(id);
    }
    findOneSupplier(id) {
        return this.suppliersService.findOne(id);
    }
    createPurchaseOrder(dto, req) {
        return this.purchasingService.create(dto, req.user.userId);
    }
    findAllPurchaseOrders(status, page, limit) {
        return this.purchasingService.findAll({
            status,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }
    findOnePurchaseOrder(id) {
        return this.purchasingService.findOne(id);
    }
};
exports.PurchasingController = PurchasingController;
__decorate([
    (0, common_1.Get)('suppliers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], PurchasingController.prototype, "findAllSuppliers", null);
__decorate([
    (0, common_1.Post)('suppliers'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'warehouse'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_supplier_dto_1.CreateSupplierDto]),
    __metadata("design:returntype", void 0)
], PurchasingController.prototype, "createSupplier", null);
__decorate([
    (0, common_1.Get)('suppliers/:id/balance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PurchasingController.prototype, "getSupplierBalance", null);
__decorate([
    (0, common_1.Get)('suppliers/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PurchasingController.prototype, "findOneSupplier", null);
__decorate([
    (0, common_1.Post)('purchase-orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'warehouse'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_po_dto_1.CreatePoDto, Object]),
    __metadata("design:returntype", void 0)
], PurchasingController.prototype, "createPurchaseOrder", null);
__decorate([
    (0, common_1.Get)('purchase-orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], PurchasingController.prototype, "findAllPurchaseOrders", null);
__decorate([
    (0, common_1.Get)('purchase-orders/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PurchasingController.prototype, "findOnePurchaseOrder", null);
exports.PurchasingController = PurchasingController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, transform: true })),
    __metadata("design:paramtypes", [suppliers_service_1.SuppliersService,
        purchasing_service_1.PurchasingService])
], PurchasingController);
