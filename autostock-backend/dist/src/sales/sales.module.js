"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const idempotency_interceptor_1 = require("../common/interceptors/idempotency.interceptor");
const events_module_1 = require("../events/events.module");
const sales_controller_1 = require("./sales.controller");
const sales_service_1 = require("./sales.service");
let SalesModule = class SalesModule {
};
exports.SalesModule = SalesModule;
exports.SalesModule = SalesModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, events_module_1.EventsModule],
        controllers: [sales_controller_1.SalesController],
        providers: [sales_service_1.SalesService, jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, idempotency_interceptor_1.IdempotencyInterceptor],
    })
], SalesModule);
//# sourceMappingURL=sales.module.js.map