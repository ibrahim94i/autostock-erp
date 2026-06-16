import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import { EventType } from '../../events/event-types.enum';

export class PushOperationDto {
  @IsString()
  @IsNotEmpty()
  clientUuid: string;

  @IsEnum(EventType)
  type: EventType;

  @IsObject()
  payload: Record<string, unknown>;

  @IsInt()
  localSeq: number;

  @IsDateString()
  occurredAt: string;
}

export class PushDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PushOperationDto)
  operations: PushOperationDto[];
}
