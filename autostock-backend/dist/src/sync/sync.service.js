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
exports.SyncService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const event_core_service_1 = require("../events/event-core.service");
let SyncService = class SyncService {
    prisma;
    eventCoreService;
    constructor(prisma, eventCoreService) {
        this.prisma = prisma;
        this.eventCoreService = eventCoreService;
    }
    async push(dto, createdBy) {
        const sorted = [...dto.operations].sort((a, b) => a.localSeq - b.localSeq);
        const applied = [];
        const rejected = [];
        for (const operation of sorted) {
            const result = await this.eventCoreService.dispatch({
                clientUuid: operation.clientUuid,
                type: operation.type,
                payload: operation.payload,
                createdBy,
                deviceId: dto.deviceId,
                localSeq: operation.localSeq,
                occurredAt: new Date(operation.occurredAt),
            });
            if (result.status === 'APPLIED') {
                applied.push(operation.clientUuid);
            }
            else {
                rejected.push({
                    clientUuid: operation.clientUuid,
                    reason: result.reason,
                });
            }
        }
        const serverSeq = await this.getMaxServerSeq();
        return { applied, rejected, serverSeq };
    }
    async pull(since) {
        const events = await this.prisma.eventLog.findMany({
            where: {
                serverSeq: { gt: since },
                status: 'APPLIED',
            },
            orderBy: { serverSeq: 'asc' },
        });
        const changes = events.map((event) => ({
            serverSeq: event.serverSeq,
            eventType: event.eventType,
            payload: event.payload,
            clientUuid: event.clientUuid,
            appliedAt: event.appliedAt,
        }));
        const serverSeq = changes.length > 0 ? changes[changes.length - 1].serverSeq : since;
        return { changes, serverSeq };
    }
    async getMaxServerSeq() {
        const result = await this.prisma.eventLog.aggregate({
            _max: { serverSeq: true },
        });
        return result._max.serverSeq ?? 0;
    }
};
exports.SyncService = SyncService;
exports.SyncService = SyncService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_core_service_1.EventCoreService])
], SyncService);
//# sourceMappingURL=sync.service.js.map