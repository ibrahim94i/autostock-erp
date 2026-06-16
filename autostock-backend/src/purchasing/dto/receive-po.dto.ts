import { IsNotEmpty, IsString } from 'class-validator';

export class ReceivePoDto {
  @IsString()
  @IsNotEmpty()
  locationId: string;
}
