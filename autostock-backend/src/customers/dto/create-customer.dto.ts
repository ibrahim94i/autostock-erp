import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsIn(['retail', 'wholesale', 'both'])
  type: 'retail' | 'wholesale' | 'both';
}
