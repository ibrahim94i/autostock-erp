"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const reports_module_1 = require("../reports/reports.module");
const settings_module_1 = require("../settings/settings.module");
const telegram_daily_job_1 = require("./telegram-daily.job");
const telegram_controller_1 = require("./telegram.controller");
const telegram_service_1 = require("./telegram.service");
let TelegramModule = class TelegramModule {
};
exports.TelegramModule = TelegramModule;
exports.TelegramModule = TelegramModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, settings_module_1.SettingsModule, reports_module_1.ReportsModule],
        controllers: [telegram_controller_1.TelegramController],
        providers: [telegram_service_1.TelegramService, telegram_daily_job_1.TelegramDailyJob, jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard],
    })
], TelegramModule);
//# sourceMappingURL=telegram.module.js.map