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
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CreateSaleItemDto {
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
  unitPrice: number;

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

export class CreateSaleDto {
  @ValidateIf((dto: CreateSaleDto) => dto.paymentType === 'debt')
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsIn(['retail', 'wholesale'])
  type: 'retail' | 'wholesale';

  @IsString()
  @IsIn(['cash', 'debt'])
  paymentType: 'cash' | 'debt';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];
}
