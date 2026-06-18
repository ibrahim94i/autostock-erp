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
exports.ExpensesController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const idempotency_interceptor_1 = require("../common/interceptors/idempotency.interceptor");
const create_expense_category_dto_1 = require("./dto/create-expense-category.dto");
const create_expense_dto_1 = require("./dto/create-expense.dto");
const update_expense_category_dto_1 = require("./dto/update-expense-category.dto");
const update_expense_dto_1 = require("./dto/update-expense.dto");
const expenses_service_1 = require("./expenses.service");
let ExpensesController = class ExpensesController {
    expensesService;
    constructor(expensesService) {
        this.expensesService = expensesService;
    }
    findAll(page, limit, from, to, categoryId) {
        return this.expensesService.findAll({ page, limit, from, to, categoryId });
    }
    create(dto, req) {
        return this.expensesService.create(dto, req.user.userId);
    }
    update(id, dto) {
        return this.expensesService.update(id, dto);
    }
    remove(id) {
        return this.expensesService.remove(id);
    }
    findCategories() {
        return this.expensesService.findCategories();
    }
    createCategory(dto) {
        return this.expensesService.createCategory(dto);
    }
    updateCategory(id, dto) {
        return this.expensesService.updateCategory(id, dto);
    }
};
exports.ExpensesController = ExpensesController;
__decorate([
    (0, common_1.Get)('expenses'),
    (0, roles_decorator_1.Roles)('admin', 'accountant'),
    __param(0, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __param(4, (0, common_1.Query)('categoryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)('expenses'),
    (0, roles_decorator_1.Roles)('admin', 'accountant'),
    (0, common_1.UseInterceptors)(idempotency_interceptor_1.IdempotencyInterceptor),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_expense_dto_1.CreateExpenseDto, Object]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('expenses/:id'),
    (0, roles_decorator_1.Roles)('admin', 'accountant'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_expense_dto_1.UpdateExpenseDto]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('expenses/:id'),
    (0, roles_decorator_1.Roles)('admin', 'accountant'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('expense-categories'),
    (0, roles_decorator_1.Roles)('admin', 'accountant'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "findCategories", null);
__decorate([
    (0, common_1.Post)('expense-categories'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_expense_category_dto_1.CreateExpenseCategoryDto]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Patch)('expense-categories/:id'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_expense_category_dto_1.UpdateExpenseCategoryDto]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "updateCategory", null);
exports.ExpensesController = ExpensesController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, transform: true })),
    __metadata("design:paramtypes", [expenses_service_1.ExpensesService])
], ExpensesController);
//# sourceMappingURL=expenses.controller.js.map