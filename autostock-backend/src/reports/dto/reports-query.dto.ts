import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class DailyReportQueryDto {
  @IsDateString()
  date!: string;
}

export class DateRangeQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}

export class SalesReportQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsIn(['day', 'month'])
  groupBy?: 'day' | 'month' = 'day';
}
