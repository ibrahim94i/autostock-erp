import { IsObject, IsString, MinLength } from 'class-validator';

export class RestoreBackupDto {
  @IsString()
  @MinLength(1)
  confirmPassword!: string;

  @IsObject()
  backupData!: Record<string, unknown>;
}
