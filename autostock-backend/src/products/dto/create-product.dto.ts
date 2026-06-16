import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsNumber()
  @IsPositive()
  costPrice: number;

  @IsNumber()
  @IsPositive()
  retailPrice: number;

  @IsNumber()
  @IsPositive()
  wholesalePrice: number;

  @IsNumber()
  @Min(0)
  minStockAlert: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  unitsPerCarton?: number;
}
