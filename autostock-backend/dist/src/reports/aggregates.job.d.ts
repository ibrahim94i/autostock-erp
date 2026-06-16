import { ReportsService } from './reports.service';
export declare class AggregatesJob {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    refreshDashboardAggregates(): Promise<void>;
}
