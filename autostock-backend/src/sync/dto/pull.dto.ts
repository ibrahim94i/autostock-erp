import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class PullDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  since?: number = 0;
}
