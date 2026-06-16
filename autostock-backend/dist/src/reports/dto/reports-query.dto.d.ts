export declare class DailyReportQueryDto {
    date: string;
}
export declare class DateRangeQueryDto {
    from: string;
    to: string;
}
export declare class SalesReportQueryDto extends DateRangeQueryDto {
    groupBy?: 'day' | 'month';
}
