import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCashDepositDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  clientUuid: string;
}
