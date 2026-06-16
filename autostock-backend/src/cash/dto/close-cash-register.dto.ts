import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CloseCashRegisterDto {
  @IsNumber()
  @Min(0)
  actualBalance: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
