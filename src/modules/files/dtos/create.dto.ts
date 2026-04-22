import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, ValidateIf } from 'class-validator';

export class UploadFilesDto {
  @ApiPropertyOptional({ description: 'ID of the resource the file is associated with. Required for post and chat uploads.' })
  @Type(() => Number)
  @IsOptional()
  @ValidateIf((_, value) => value !== undefined && value !== null && value !== '')
  @IsInt()
  @Min(1)
  resourceId?: number;
}
