import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class BulkImportProductItemDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  categoryName: string;

  @IsNumber()
  @IsPositive()
  costPrice: number;

  @IsNumber()
  @IsPositive()
  retailPrice: number;

  @IsNumber()
  @IsPositive()
  wholesalePrice: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStockAlert?: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  unitsPerCarton?: number;
}

export class BulkImportProductsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkImportProductItemDto)
  items: BulkImportProductItemDto[];
}
