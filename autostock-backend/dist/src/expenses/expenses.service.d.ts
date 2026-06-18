import { OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpensesQueryDto } from './dto/expenses-query.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
export declare class ExpensesService implements OnModuleInit {
    private readonly prisma;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    seedDefaultCategories(): Promise<void>;
    findAll(query: ExpensesQueryDto & {
        page: number;
        limit: number;
    }): Promise<{
        items: ({
            category: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            date: Date;
            createdBy: string;
            createdAt: Date;
            amount: Prisma.Decimal;
            description: string | null;
            categoryId: string;
            clientUuid: string;
        })[];
        total: string;
        page: number;
        limit: number;
        totalCount: number;
    }>;
    create(dto: CreateExpenseDto, userId: string): Promise<{
        category: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        date: Date;
        createdBy: string;
        createdAt: Date;
        amount: Prisma.Decimal;
        description: string | null;
        categoryId: string;
        clientUuid: string;
    }>;
    update(id: string, dto: UpdateExpenseDto): Promise<{
        category: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        date: Date;
        createdBy: string;
        createdAt: Date;
        amount: Prisma.Decimal;
        description: string | null;
        categoryId: string;
        clientUuid: string;
    }>;
    findCategories(): Promise<{
        id: string;
        name: string;
    }[]>;
    createCategory(dto: CreateExpenseCategoryDto): Promise<{
        id: string;
        name: string;
    }>;
    updateCategory(id: string, dto: UpdateExpenseCategoryDto): Promise<{
        id: string;
        name: string;
    }>;
    remove(id: string): Promise<{
        deleted: true;
    }>;
}
