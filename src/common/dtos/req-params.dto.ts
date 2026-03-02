import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsUUID } from 'class-validator';

export class UUIDParamDto {
  @ApiProperty({
    description: 'The unique identifier of the resource',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id: string;
}

export class NumericIdParamDto {
  @ApiProperty({
    description: 'The unique identifier of the resource',
    example: 123,
  })
  @Type(() => Number)
  @IsNumber()
  id: number;
}
