import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Customer, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

export interface FindCustomersQuery {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedCustomers {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerBalanceResponse {
  customerId: string;
  balance: Prisma.Decimal | number;
}

export interface CustomerStatementLine {
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  accountId: string;
  entryId: string;
  entryDate: Date;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FindCustomersQuery): Promise<PaginatedCustomers> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    return customer;
  }

  async create(dto: CreateCustomerDto): Promise<Customer> {
    return this.prisma.customer.create({
      data: {
        name: dto.name,
        phone: dto.phone ?? '',
        type: dto.type,
      },
    });
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    await this.findOne(id);

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
      },
    });
  }

  async remove(id: string): Promise<{ deleted: true }> {
    await this.findOne(id);

    const balanceView = await this.prisma.customerBalanceView.findUnique({
      where: { customerId: id },
    });
    const balance = balanceView ? Number(balanceView.balance) : 0;
    if (Math.abs(balance) > 0.0001) {
      throw new UnprocessableEntityException('لا يمكن حذف عميل له رصيد');
    }

    const salesCount = await this.prisma.sale.count({ where: { customerId: id } });
    if (salesCount > 0) {
      throw new UnprocessableEntityException('لا يمكن حذف عميل له مبيعات مسجّلة');
    }

    await this.prisma.customer.delete({ where: { id } });
    return { deleted: true };
  }

  async getBalance(id: string): Promise<CustomerBalanceResponse> {
    await this.findOne(id);

    const balanceView = await this.prisma.customerBalanceView.findUnique({
      where: { customerId: id },
    });

    return {
      customerId: id,
      balance: balanceView?.balance ?? 0,
    };
  }

  async getBalancesBulk(ids?: string[]): Promise<CustomerBalanceResponse[]> {
    const where =
      ids && ids.length > 0 ? { customerId: { in: ids } } : undefined;

    const rows = await this.prisma.customerBalanceView.findMany({ where });
    const balanceById = new Map(rows.map((row) => [row.customerId, row.balance]));

    if (ids && ids.length > 0) {
      return ids.map((customerId) => ({
        customerId,
        balance: balanceById.get(customerId) ?? 0,
      }));
    }

    return rows.map((row) => ({
      customerId: row.customerId,
      balance: row.balance,
    }));
  }

  async getStatement(id: string): Promise<CustomerStatementLine[]> {
    await this.findOne(id);

    const lines = await this.prisma.journalLine.findMany({
      where: {
        partyType: 'CUSTOMER',
        partyId: id,
      },
      include: {
        entry: {
          select: {
            id: true,
            entryDate: true,
          },
        },
      },
      orderBy: {
        entry: {
          entryDate: 'asc',
        },
      },
    });

    return lines.map((line) => ({
      debit: line.debit,
      credit: line.credit,
      accountId: line.accountId,
      entryId: line.entryId,
      entryDate: line.entry.entryDate,
    }));
  }
}
