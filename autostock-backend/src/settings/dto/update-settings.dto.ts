import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpdateSettingsDto {
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsOptional()
  @IsString()
  companyPhone?: string;

  @IsOptional()
  @IsString()
  companyAddress?: string;

  @IsOptional()
  @IsString()
  companyLogo?: string;

  @IsOptional()
  @IsString()
  taxNumber?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  @IsIn(['58mm', '80mm', 'A4'])
  receiptSize?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultTaxRate?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  defaultReceiptFooter?: string;

  @IsOptional()
  @IsString()
  telegramBotToken?: string;

  @IsOptional()
  @IsString()
  telegramChatId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d$/)
  telegramDailyTime?: string;

  @IsOptional()
  @IsBoolean()
  telegramEnabled?: boolean;
}
