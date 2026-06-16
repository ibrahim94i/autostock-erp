import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ExpensesQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
