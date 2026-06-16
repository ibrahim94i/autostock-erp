import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';



export class LogReceiptDto {

  @IsUUID()

  saleId: string;



  @IsOptional()

  @IsString()

  invoiceNumber?: string;



  @IsOptional()

  @IsString()

  customerName?: string;



  @IsNumber()

  @IsPositive()

  totalAmount: number;

}

