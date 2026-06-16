import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EventCoreService } from '../events/event-core.service';
import { PushDto } from './dto/push.dto';

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventCoreService: EventCoreService,
  ) {}

  async push(dto: PushDto, createdBy: string) {
    const sorted = [...dto.operations].sort((a, b) => a.localSeq - b.localSeq);

    const applied: string[] = [];
    const rejected: { clientUuid: string; reason: string }[] = [];

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
      } else {
        rejected.push({
          clientUuid: operation.clientUuid,
          reason: result.reason,
        });
      }
    }

    const serverSeq = await this.getMaxServerSeq();

    return { applied, rejected, serverSeq };
  }

  async pull(since: number) {
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

    const serverSeq =
      changes.length > 0 ? changes[changes.length - 1].serverSeq : since;

    return { changes, serverSeq };
  }

  private async getMaxServerSeq(): Promise<number> {
    const result = await this.prisma.eventLog.aggregate({
      _max: { serverSeq: true },
    });

    return result._max.serverSeq ?? 0;
  }
}
