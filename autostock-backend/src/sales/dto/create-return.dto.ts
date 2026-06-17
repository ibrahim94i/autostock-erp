import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateReturnItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;

  @IsNumber()
  @IsPositive()
  qty: number;

  @IsNumber()
  @IsPositive()
  unitCost: number;

  @IsOptional()
  @IsIn(['piece', 'carton'])
  qtyUnit?: 'piece' | 'carton';

  @IsOptional()
  @IsNumber()
  @IsPositive()
  displayQty?: number;
}

export class CreateReturnDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateReturnItemDto)
  items: CreateReturnItemDto[];

  @IsString()
  @IsIn(['cash', 'credit'])
  refundMethod: 'cash' | 'credit';

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsNumber()
  @IsPositive()
  refundAmount: number;
}
