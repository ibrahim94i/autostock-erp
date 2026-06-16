import { Customer, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
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
export declare class CustomersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(query: FindCustomersQuery): Promise<PaginatedCustomers>;
    findOne(id: string): Promise<Customer>;
    create(dto: CreateCustomerDto): Promise<Customer>;
    getBalance(id: string): Promise<CustomerBalanceResponse>;
    getStatement(id: string): Promise<CustomerStatementLine[]>;
}
