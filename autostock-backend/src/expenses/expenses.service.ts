import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { startOfUtcDay } from '../cash/handlers/cash.handler';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpensesQueryDto } from './dto/expenses-query.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

const DEFAULT_CATEGORIES = [
  'إيجار',
  'كهرباء',
  'ماء',
  'رواتب',
  'وقود',
  'صيانة',
  'أخرى',
] as const;

@Injectable()
export class ExpensesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaultCategories();
  }

  async seedDefaultCategories(): Promise<void> {
    for (const name of DEFAULT_CATEGORIES) {
      await this.prisma.expenseCategory.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
  }

  async findAll(query: ExpensesQueryDto & { page: number; limit: number }) {
    const where: Prisma.ExpenseWhereInput = {};

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.from || query.to) {
      where.date = {};
      if (query.from) {
        where.date.gte = startOfUtcDay(new Date(query.from));
      }
      if (query.to) {
        const toEnd = startOfUtcDay(new Date(query.to));
        toEnd.setUTCDate(toEnd.getUTCDate() + 1);
        where.date.lt = toEnd;
      }
    }

    const page = query.page > 0 ? query.page : 1;
    const limit = query.limit > 0 ? query.limit : 50;
    const skip = (page - 1) * limit;

    const [items, aggregate] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.expense.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const total = aggregate._sum.amount ?? new Prisma.Decimal(0);

    return {
      items,
      total: total.toString(),
      page,
      limit,
      totalCount: aggregate._count,
    };
  }

  async create(dto: CreateExpenseDto, userId: string) {
    const existing = await this.prisma.expense.findUnique({
      where: { clientUuid: dto.clientUuid },
    });

    if (existing) {
      return this.prisma.expense.findUniqueOrThrow({
        where: { id: existing.id },
        include: { category: true },
      });
    }

    const category = await this.prisma.expenseCategory.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('فئة المصروف غير موجودة');
    }

    const expenseDate = startOfUtcDay(new Date(dto.date));

    return this.prisma.runInTransaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          clientUuid: dto.clientUuid,
          date: expenseDate,
          amount: dto.amount,
          categoryId: dto.categoryId,
          description: dto.description?.trim() || null,
          createdBy: userId,
        },
        include: { category: true },
      });

      const register = await tx.cashRegister.findFirst({
        where: {
          date: expenseDate,
          status: 'open',
        },
      });

      if (register) {
        const description =
          dto.description?.trim() ||
          `مصروف — ${category.name}`;

        await tx.cashTransaction.create({
          data: {
            registerId: register.id,
            type: 'expense',
            amount: dto.amount,
            description,
            reference: expense.id,
            createdBy: userId,
          },
        });
      }

      return expense;
    });
  }

  async update(id: string, dto: UpdateExpenseDto) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('المصروف غير موجود');
    }

    if (dto.categoryId) {
      const category = await this.prisma.expenseCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('فئة المصروف غير موجودة');
      }
    }

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.date !== undefined ? { date: startOfUtcDay(new Date(dto.date)) } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
      },
      include: { category: true },
    });
  }

  async findCategories() {
    return this.prisma.expenseCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: CreateExpenseCategoryDto) {
    const name = dto.name.trim();

    try {
      return await this.prisma.expenseCategory.create({
        data: { name },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('اسم الفئة موجود مسبقاً');
      }
      throw error;
    }
  }

  async updateCategory(id: string, dto: UpdateExpenseCategoryDto) {
    const name = dto.name.trim();

    try {
      return await this.prisma.expenseCategory.update({
        where: { id },
        data: { name },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('اسم الفئة موجود مسبقاً');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('فئة المصروف غير موجودة');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('المصروف غير موجود');
    }

    await this.prisma.expense.delete({ where: { id } });
    return { deleted: true };
  }
}
