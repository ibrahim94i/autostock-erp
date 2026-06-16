import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, of } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
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
      return of({
        status: 'APPLIED',
        result: eventLog.result,
        idempotent: true,
      });
    }

    if (eventLog.status === 'REJECTED') {
      const stored = eventLog.result as { reason?: string } | null;
      return of({
        status: 'REJECTED',
        reason: stored?.reason ?? 'Validation failed',
        idempotent: true,
      });
    }

    return next.handle();
  }

  private extractClientUuid(request: Request): string | undefined {
    const header = request.headers['x-client-uuid'];
    if (typeof header === 'string' && header.trim()) {
      return header.trim();
    }

    const body = request.body as { clientUuid?: unknown } | undefined;
    if (body && typeof body.clientUuid === 'string' && body.clientUuid.trim()) {
      return body.clientUuid.trim();
    }

    return undefined;
  }
}
