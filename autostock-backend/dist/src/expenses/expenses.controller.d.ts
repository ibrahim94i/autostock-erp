import { Request } from 'express';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpensesQueryDto } from './dto/expenses-query.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';
export declare class ExpensesController {
    private readonly expensesService;
    constructor(expensesService: ExpensesService);
    findAll(query: ExpensesQueryDto): Promise<{
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
            amount: import("@prisma/client-runtime-utils").Decimal;
            description: string | null;
            categoryId: string;
            clientUuid: string;
        })[];
        total: string;
    }>;
    create(dto: CreateExpenseDto, req: Request & {
        user: JwtPayload;
    }): Promise<{
        category: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        date: Date;
        createdBy: string;
        createdAt: Date;
        amount: import("@prisma/client-runtime-utils").Decimal;
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
        amount: import("@prisma/client-runtime-utils").Decimal;
        description: string | null;
        categoryId: string;
        clientUuid: string;
    }>;
    remove(id: string): Promise<{
        deleted: true;
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
}
