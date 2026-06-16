import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sku?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  retailPrice?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  wholesalePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockAlert?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  unit?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  unitsPerCarton?: number;
}
