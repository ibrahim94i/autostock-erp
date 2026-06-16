import { Request } from 'express';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { StockQueryDto } from './dto/stock-query.dto';
import { InventoryService } from './inventory.service';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    reconcile(dto: AdjustStockDto, req: Request & {
        user: JwtPayload;
    }): Promise<import("../events/event-core.service").DispatchResult>;
    getBalances(query: StockQueryDto): Promise<import("./inventory.service").PaginatedStockBalances>;
    getLowAlerts(): Promise<import("./inventory.service").LowStockAlert[]>;
}
