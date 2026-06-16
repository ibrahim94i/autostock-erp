import {

  BadRequestException,

  ConflictException,

  Injectable,

  NotFoundException,

} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../common/prisma/prisma.service';

import { CloseCashRegisterDto } from './dto/close-cash-register.dto';

import { CashHistoryQueryDto } from './dto/cash-history-query.dto';

import { OpenCashRegisterDto } from './dto/open-cash-register.dto';

import {

  isInflowTransaction,

  isOutflowTransaction,

  startOfUtcDay,

} from './handlers/cash.handler';



export interface CashRegisterSummary {

  totalIn: Prisma.Decimal;

  totalOut: Prisma.Decimal;

  expectedBalance: Prisma.Decimal;

}



@Injectable()

export class CashService {

  constructor(private readonly prisma: PrismaService) {}



  async open(dto: OpenCashRegisterDto, userId: string) {

    const today = startOfUtcDay(new Date());



    const openRegister = await this.prisma.cashRegister.findFirst({

      where: { date: today, status: 'open' },

    });



    if (openRegister) {

      throw new ConflictException('الصندوق مفتوح بالفعل لهذا اليوم');

    }



    return this.prisma.cashRegister.create({

      data: {

        date: today,

        openingBalance: dto.openingBalance,

        status: 'open',

        createdBy: userId,

      },

      include: { transactions: { orderBy: { createdAt: 'asc' } } },

    });

  }



  async getToday() {

    const today = startOfUtcDay(new Date());



    const openRegister = await this.prisma.cashRegister.findFirst({

      where: { date: today, status: 'open' },

      include: {

        transactions: { orderBy: { createdAt: 'asc' } },

      },

      orderBy: { createdAt: 'desc' },

    });



    if (openRegister) {

      return {

        register: openRegister,

        summary: this.computeSummary(openRegister.openingBalance, openRegister.transactions),

      };

    }



    const lastClosed = await this.prisma.cashRegister.findFirst({

      where: { date: today, status: 'closed' },

      include: {

        transactions: { orderBy: { createdAt: 'asc' } },

      },

      orderBy: { createdAt: 'desc' },

    });



    if (!lastClosed) {

      return { register: null, summary: null };

    }



    return {

      register: lastClosed,

      summary: this.computeSummary(lastClosed.openingBalance, lastClosed.transactions),

    };

  }



  async close(dto: CloseCashRegisterDto, userId: string) {

    const today = startOfUtcDay(new Date());

    const register = await this.prisma.cashRegister.findFirst({

      where: { date: today, status: 'open' },

      include: { transactions: true },

      orderBy: { createdAt: 'desc' },

    });



    if (!register) {

      throw new NotFoundException('لا يوجد صندوق مفتوح لهذا اليوم');

    }



    if (register.status !== 'open') {

      throw new BadRequestException('الصندوق مغلق بالفعل');

    }



    const summary = this.computeSummary(register.openingBalance, register.transactions);

    const actualBalance = new Prisma.Decimal(dto.actualBalance);

    const difference = actualBalance.minus(summary.expectedBalance);



    return this.prisma.cashRegister.update({

      where: { id: register.id },

      data: {

        status: 'closed',

        closingBalance: summary.expectedBalance,

        actualBalance,

        difference,

        notes: dto.notes?.trim() || null,

        createdBy: register.createdBy || userId,

      },

      include: {

        transactions: { orderBy: { createdAt: 'asc' } },

      },

    });

  }



  async getHistory(query: CashHistoryQueryDto) {

    const where: Prisma.CashRegisterWhereInput = {};



    if (query.from || query.to) {

      where.date = {};

      if (query.from) {

        where.date.gte = startOfUtcDay(new Date(query.from));

      }

      if (query.to) {

        const toDate = startOfUtcDay(new Date(query.to));

        toDate.setUTCDate(toDate.getUTCDate() + 1);

        where.date.lt = toDate;

      }

    }



    const registers = await this.prisma.cashRegister.findMany({

      where,

      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],

      include: {

        transactions: { orderBy: { createdAt: 'asc' } },

      },

    });



    return registers.map((register) => ({

      ...register,

      summary: this.computeSummary(register.openingBalance, register.transactions),

    }));

  }



  private computeSummary(

    openingBalance: Prisma.Decimal,

    transactions: Array<{ type: string; amount: Prisma.Decimal }>,

  ): CashRegisterSummary {

    let totalIn = new Prisma.Decimal(0);

    let totalOut = new Prisma.Decimal(0);



    for (const tx of transactions) {

      if (isInflowTransaction(tx.type)) {

        totalIn = totalIn.plus(tx.amount);

      } else if (isOutflowTransaction(tx.type)) {

        totalOut = totalOut.plus(tx.amount);

      }

    }



    const expectedBalance = openingBalance.plus(totalIn).minus(totalOut);



    return { totalIn, totalOut, expectedBalance };

  }

}


