import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { CurrentUser, Roles } from '../../../common/decorators';
import { type AuthenticatedUser } from '../../../common/interfaces';
import {
  ForbiddenErrorResponse,
  UnauthorizedErrorResponse,
  ValidationErrorResponse,
} from '../../../common/swagger/responses';
import { RolesGuard } from '../../../common/guards';
import { AdminRetryCommentsDto, AdminRetryCommentsResponseDto } from '../dtos/admin-retry-comments.dto';
import { AdminService } from '../services';

@ApiTags('admin-comments')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('admin')
export class AdminCommentsController {
  constructor(private readonly adminService: AdminService) {}

  @Roles(UserRoles.ADMIN)
  @Post('retry-comments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry failed comments moderation jobs (Admin only)' })
  @ApiBody({ type: AdminRetryCommentsDto, required: false })
  @ApiResponse({ status: 200, description: 'Retry scheduled successfully', type: AdminRetryCommentsResponseDto })
  @ApiResponse({ status: 400, description: 'Validation failed', type: ValidationErrorResponse })
  @ApiResponse({ status: 401, description: 'Missing or invalid token', type: UnauthorizedErrorResponse })
  @ApiResponse({ status: 403, description: 'Admin role required', type: ForbiddenErrorResponse })
  async retryComments(
    @Body() dto: AdminRetryCommentsDto = {},
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ message: string; queuedCount: number }> {
    return this.adminService.retryFailedCommentsModeration(dto, currentUser.userId);
  }
}
