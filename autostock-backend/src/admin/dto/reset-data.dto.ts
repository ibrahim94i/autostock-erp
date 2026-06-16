import { Equals, IsString } from 'class-validator';

export class ResetDataDto {
  @IsString()
  @Equals('RESET')
  confirm: string;
}
