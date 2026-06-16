import { IsDateString } from 'class-validator';

export class PlQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}
