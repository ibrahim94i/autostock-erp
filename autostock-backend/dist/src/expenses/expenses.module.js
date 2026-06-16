"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpensesModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const idempotency_interceptor_1 = require("../common/interceptors/idempotency.interceptor");
const expenses_controller_1 = require("./expenses.controller");
const expenses_service_1 = require("./expenses.service");
let ExpensesModule = class ExpensesModule {
};
exports.ExpensesModule = ExpensesModule;
exports.ExpensesModule = ExpensesModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [expenses_controller_1.ExpensesController],
        providers: [expenses_service_1.ExpensesService, jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, idempotency_interceptor_1.IdempotencyInterceptor],
        exports: [expenses_service_1.ExpensesService],
    })
], ExpensesModule);
//# sourceMappingURL=expenses.module.js.map