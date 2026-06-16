import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateExpenseDto {
  @IsDateString()
  date: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  clientUuid: string;
}
