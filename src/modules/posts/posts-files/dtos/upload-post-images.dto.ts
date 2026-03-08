import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min, IsOptional, IsBoolean } from 'class-validator';

export class UploadPostImagesDto {
  @ApiProperty({ description: 'ID of the post' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  postId: number;

  @ApiProperty({ description: 'Mark first image as main', required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  mainImage?: boolean;
}
