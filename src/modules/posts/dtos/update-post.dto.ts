import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePostDto {
  @ApiProperty({
    description: 'The title of the post',
    example: 'New Post Title',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  title?: string;

  @ApiProperty({
    description: 'The content of the post',
    example: 'This is the updated content of the post.',
  })
  @IsOptional()
  @IsString()
  @MinLength(50)
  content?: string;
}
