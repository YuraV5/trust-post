import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRoles } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../../common/decorators';
import { RolesGuard } from '../../../common/guards';
import { UUIDParamDto } from '../../../common/dtos/req-params.dto';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { ResponseMessage } from '../../../common/types';
import {
  BadRequestErrorResponse,
  ForbiddenErrorResponse,
  MessageResponseDto,
  NotFoundErrorResponse,
  UnauthorizedErrorResponse,
  ValidationErrorResponse,
} from '../../../common/swagger/responses';
import { AdminDeleteDto, AdminUserCreationDto, AdminUsersQueryDto, UpdateRolesDto } from '../../users/dtos';
import { UserAdminOutput } from '../../users/types';
import { PaginatedResult } from '../../users/types/paginated';
import { UserRolePeriodResponseDto } from '../../user-role-periods/dtos';
import { UserRolePeriodOutput } from '../../user-role-periods/types';
import { AdminService } from '../services';

@ApiTags('admin-users')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Roles(UserRoles.ADMIN)
  @Get()
  async getAllUsers(@Query() query: AdminUsersQueryDto): Promise<PaginatedResult<UserAdminOutput>> {
    return this.adminService.findAllForAdmin(query);
  }

  @Roles(UserRoles.ADMIN)
  @Post()
  async createUser(
    @Body() inp: AdminUserCreationDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ResponseMessage> {
    return this.adminService.createUserByAdmin(inp, currentUser.userId);
  }

  @Roles(UserRoles.ADMIN)
  @Get('/:id')
  async getUserById(@Param() params: UUIDParamDto): Promise<UserAdminOutput> {
    return this.adminService.findByIdForAdmin(params.id);
  }

  @Roles(UserRoles.ADMIN)
  @Patch('/:id/toggle-status')
  async updateStatus(@Param() params: UUIDParamDto): Promise<ResponseMessage> {
    return this.adminService.updateStatus(params.id);
  }

  @Roles(UserRoles.ADMIN)
  @Patch('/:id/roles')
  @ApiOperation({ summary: 'Change user role and track role period history' })
  @ApiResponse({ status: 200, description: 'User role updated successfully', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request payload', type: BadRequestErrorResponse })
  @ApiResponse({ status: 400, description: 'Validation failed', type: ValidationErrorResponse })
  @ApiResponse({ status: 401, description: 'Missing or invalid token', type: UnauthorizedErrorResponse })
  @ApiResponse({ status: 403, description: 'Admin role required', type: ForbiddenErrorResponse })
  @ApiResponse({ status: 404, description: 'Target user not found', type: NotFoundErrorResponse })
  async updateUserRoles(
    @Param() params: UUIDParamDto,
    @Body() data: UpdateRolesDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ResponseMessage> {
    return this.adminService.changeRoles(params.id, currentUser.userId, data.role);
  }

  @Roles(UserRoles.ADMIN)
  @Get('/:id/role-history')
  @ApiOperation({ summary: 'Get role history for a specific user' })
  @ApiResponse({
    status: 200,
    description: 'Role history fetched successfully',
    type: UserRolePeriodResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token', type: UnauthorizedErrorResponse })
  @ApiResponse({ status: 403, description: 'Admin role required', type: ForbiddenErrorResponse })
  @ApiResponse({ status: 404, description: 'User not found', type: NotFoundErrorResponse })
  async getUserRoleHistory(@Param() params: UUIDParamDto): Promise<UserRolePeriodOutput[]> {
    return this.adminService.getUserRoleHistory(params.id);
  }

  @Roles(UserRoles.ADMIN)
  @Delete()
  async deleteUser(@Body() data: AdminDeleteDto): Promise<ResponseMessage> {
    return this.adminService.deleteMany(data.ids);
  }
}
