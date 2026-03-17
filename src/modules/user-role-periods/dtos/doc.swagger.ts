import { ApiProperty } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';

export class UserRolePeriodResponseDto {
  @ApiProperty({ example: 1, description: 'Role period record id' })
  id: number;

  @ApiProperty({ enum: UserRoles, example: UserRoles.MODERATOR, description: 'Role assigned for this period' })
  role: string;

  @ApiProperty({ example: '2026-03-17T09:00:00.000Z', description: 'Period start timestamp' })
  startDate: Date;

  @ApiProperty({
    example: '2026-03-17T12:00:00.000Z',
    nullable: true,
    description: 'Period end timestamp. Null means role is still active',
  })
  endDate: Date | null;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'User id that performed the role change',
  })
  changedById: string;

  @ApiProperty({ example: '2026-03-17T09:00:00.000Z', description: 'Record creation timestamp' })
  createdAt: Date;
}
