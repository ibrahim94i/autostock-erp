import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
export declare class IdempotencyInterceptor implements NestInterceptor {
    private readonly prisma;
    constructor(prisma: PrismaService);
    intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>>;
    private extractClientUuid;
}
