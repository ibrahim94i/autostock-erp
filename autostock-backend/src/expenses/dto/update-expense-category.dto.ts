import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateExpenseCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
