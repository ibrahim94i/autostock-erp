import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @IsIn(['retail', 'wholesale', 'both'])
  type?: 'retail' | 'wholesale' | 'both';
}
