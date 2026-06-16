import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsIn(['CUSTOMER', 'SUPPLIER'])
  partyType: 'CUSTOMER' | 'SUPPLIER';

  @IsString()
  @IsNotEmpty()
  partyId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsIn(['IN', 'OUT'])
  direction: 'IN' | 'OUT';

  @IsOptional()
  @IsString()
  @IsIn(['cash'])
  method?: string;
}
