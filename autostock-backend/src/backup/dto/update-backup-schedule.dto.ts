import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateBackupScheduleDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  intervalHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  keepLastN?: number;
}
