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
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const prisma_service_1 = require("../prisma/prisma.service");
let IdempotencyInterceptor = class IdempotencyInterceptor {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const clientUuid = this.extractClientUuid(request);
        if (!clientUuid) {
            return next.handle();
        }
        const eventLog = await this.prisma.eventLog.findUnique({
            where: { clientUuid },
        });
        if (!eventLog) {
            return next.handle();
        }
        if (eventLog.status === 'APPLIED') {
            return (0, rxjs_1.of)({
                status: 'APPLIED',
                result: eventLog.result,
                idempotent: true,
            });
        }
        if (eventLog.status === 'REJECTED') {
            const stored = eventLog.result;
            return (0, rxjs_1.of)({
                status: 'REJECTED',
                reason: stored?.reason ?? 'Validation failed',
                idempotent: true,
            });
        }
        return next.handle();
    }
    extractClientUuid(request) {
        const header = request.headers['x-client-uuid'];
        if (typeof header === 'string' && header.trim()) {
            return header.trim();
        }
        const body = request.body;
        if (body && typeof body.clientUuid === 'string' && body.clientUuid.trim()) {
            return body.clientUuid.trim();
        }
        return undefined;
    }
};
exports.IdempotencyInterceptor = IdempotencyInterceptor;
exports.IdempotencyInterceptor = IdempotencyInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IdempotencyInterceptor);
//# sourceMappingURL=idempotency.interceptor.js.map