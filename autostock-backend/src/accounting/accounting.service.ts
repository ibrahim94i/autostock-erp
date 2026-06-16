import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  DispatchResult,
  EventCoreService,
} from '../events/event-core.service';
import { EventType } from '../events/event-types.enum';
import { CreatePaymentDto } from './dto/create-payment.dto';

const PL_ACCOUNT_CODES = {
  sales: '4000',
  salesReturns: '4100',
  cogs: '5000',
} as const;

@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventCoreService: EventCoreService,
  ) {}

  async createPayment(
    dto: CreatePaymentDto,
    createdBy: string,
  ): Promise<DispatchResult> {
    const clientUuid = randomUUID();
    const method = dto.method ?? 'cash';

    return this.eventCoreService.dispatch({
      clientUuid,
      type: EventType.PAYMENT_MADE,
      payload: {
        partyType: dto.partyType,
        partyId: dto.partyId,
        amount: dto.amount,
        direction: dto.direction,
        method,
      },
      createdBy,
      deviceId: 'accounting-api',
      occurredAt: new Date(),
      onCommit: async (tx) => {
        const payment = await tx.payment.create({
          data: {
            clientUuid,
            partyType: dto.partyType,
            partyId: dto.partyId,
            amount: dto.amount,
            method,
            direction: dto.direction,
          },
        });

        return { paymentId: payment.id };
      },
    });
  }

  async getProfitAndLoss(from: Date, to: Date) {
    const accounts = await this.prisma.account.findMany({
      where: {
        code: {
          in: [
            PL_ACCOUNT_CODES.sales,
            PL_ACCOUNT_CODES.salesReturns,
            PL_ACCOUNT_CODES.cogs,
          ],
        },
      },
    });

    const accountIds = accounts.map((a) => a.id);

    const lines = await this.prisma.journalLine.findMany({
      where: {
        accountId: { in: accountIds },
        entry: {
          entryDate: { gte: from, lte: to },
        },
      },
      include: { account: true },
    });

    let revenue = new Prisma.Decimal(0);
    let returns = new Prisma.Decimal(0);
    let cogsDebit = new Prisma.Decimal(0);
    let cogsCredit = new Prisma.Decimal(0);

    for (const line of lines) {
      switch (line.account.code) {
        case PL_ACCOUNT_CODES.sales:
          revenue = revenue.plus(line.credit);
          break;
        case PL_ACCOUNT_CODES.salesReturns:
          returns = returns.plus(line.debit);
          break;
        case PL_ACCOUNT_CODES.cogs:
          cogsDebit = cogsDebit.plus(line.debit);
          cogsCredit = cogsCredit.plus(line.credit);
          break;
      }
    }

    const cogs = cogsDebit.minus(cogsCredit);
    const netProfit = revenue.minus(returns).minus(cogs);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      revenue: revenue.toNumber(),
      returns: returns.toNumber(),
      cogs: cogs.toNumber(),
      netProfit: netProfit.toNumber(),
    };
  }

  listAccounts() {
    return this.prisma.account.findMany({ orderBy: { code: 'asc' } });
  }
}
