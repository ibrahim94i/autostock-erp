import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    findAll(search?: string, page?: string, limit?: string): Promise<import("./customers.service").PaginatedCustomers>;
    create(dto: CreateCustomerDto): Promise<{
        id: string;
        name: string;
        type: string;
        phone: string;
    }>;
    update(id: string, dto: UpdateCustomerDto): Promise<{
        id: string;
        name: string;
        type: string;
        phone: string;
    }>;
    remove(id: string): Promise<{
        deleted: true;
    }>;
    getBalance(id: string): Promise<import("./customers.service").CustomerBalanceResponse>;
    getStatement(id: string): Promise<import("./customers.service").CustomerStatementLine[]>;
    findOne(id: string): Promise<{
        id: string;
        name: string;
        type: string;
        phone: string;
    }>;
}
