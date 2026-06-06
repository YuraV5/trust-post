import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class PaymentsQueryDto {
  @ApiProperty({ example: 1, required: false })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ example: 10, required: false })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ enum: PaymentStatus, required: false })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiProperty({ example: 12, required: false })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  postId?: number;
}
