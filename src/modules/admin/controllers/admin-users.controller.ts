import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRoles } from '@prisma/client';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
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
import { AdminDashboardResponseDto, AdminRoleHistoryEntryResponseDto } from '../dtos/doc.swagger';
import { AdminDeleteDto, AdminUserCreationDto, AdminUsersQueryDto, UpdateRolesDto } from '../../users/dtos';
import { UserAdminOutput } from '../../users/types';
import { PaginatedResult } from '../../users/types/paginated';
import { UserRolePeriodResponseDto } from '../../user-role-periods/dtos';
import { UserRolePeriodOutput } from '../../user-role-periods/types';
import { AdminDashboardOutput, AdminRoleHistoryEntryOutput, AdminService } from '../services';

@ApiTags('admin-users')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Roles(UserRoles.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all users for admin panel (paginated, filterable)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name or email' })
  @ApiQuery({ name: 'role', required: false, type: String, description: 'Filter by user role' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token', type: UnauthorizedErrorResponse })
  @ApiResponse({ status: 403, description: 'Admin role required', type: ForbiddenErrorResponse })
  async getAllUsers(@Query() query: AdminUsersQueryDto): Promise<PaginatedResult<UserAdminOutput>> {
    return this.adminService.findAllForAdmin(query);
  }

  @Roles(UserRoles.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create user by admin' })
  @ApiBody({ type: AdminUserCreationDto })
  @ApiResponse({ status: 201, description: 'User created successfully', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid payload', type: BadRequestErrorResponse })
  @ApiResponse({ status: 401, description: 'Missing or invalid token', type: UnauthorizedErrorResponse })
  @ApiResponse({ status: 403, description: 'Admin role required', type: ForbiddenErrorResponse })
  async createUser(
    @Body() inp: AdminUserCreationDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ResponseMessage> {
    return this.adminService.createUserByAdmin(inp, currentUser.userId);
  }

  @Roles(UserRoles.ADMIN)
  @Get('/dashboard')
  @ApiOperation({ summary: 'Get admin dashboard summary' })
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard summary retrieved successfully',
    type: AdminDashboardResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token', type: UnauthorizedErrorResponse })
  @ApiResponse({ status: 403, description: 'Admin role required', type: ForbiddenErrorResponse })
  getDashboardSummary(): Promise<AdminDashboardOutput> {
    return this.adminService.getDashboardSummary();
  }

  @Roles(UserRoles.ADMIN)
  @Get('/role-history')
  @ApiOperation({ summary: 'Get role history for all users' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by user name or email' })
  @ApiResponse({
    status: 200,
    description: 'Global role history fetched successfully',
    type: AdminRoleHistoryEntryResponseDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token', type: UnauthorizedErrorResponse })
  @ApiResponse({ status: 403, description: 'Admin role required', type: ForbiddenErrorResponse })
  getAllRoleHistory(@Query('search') search?: string): Promise<AdminRoleHistoryEntryOutput[]> {
    return this.adminService.getAllRoleHistory(search);
  }

  @Roles(UserRoles.ADMIN)
  @Get('/:id')
  @ApiOperation({ summary: 'Get user details by id (Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token', type: UnauthorizedErrorResponse })
  @ApiResponse({ status: 403, description: 'Admin role required', type: ForbiddenErrorResponse })
  @ApiResponse({ status: 404, description: 'User not found', type: NotFoundErrorResponse })
  async getUserById(@Param() params: UUIDParamDto): Promise<UserAdminOutput> {
    return this.adminService.findByIdForAdmin(params.id);
  }

  @Roles(UserRoles.ADMIN)
  @Patch('/:id/toggle-status')
  @ApiOperation({ summary: 'Toggle user active status (Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User status updated successfully', type: MessageResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token', type: UnauthorizedErrorResponse })
  @ApiResponse({ status: 403, description: 'Admin role required', type: ForbiddenErrorResponse })
  @ApiResponse({ status: 404, description: 'User not found', type: NotFoundErrorResponse })
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
  @ApiOperation({ summary: 'Delete users in bulk (Admin only)' })
  @ApiBody({ type: AdminDeleteDto })
  @ApiResponse({ status: 200, description: 'Users deleted successfully', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request payload', type: BadRequestErrorResponse })
  @ApiResponse({ status: 401, description: 'Missing or invalid token', type: UnauthorizedErrorResponse })
  @ApiResponse({ status: 403, description: 'Admin role required', type: ForbiddenErrorResponse })
  async deleteUser(@Body() data: AdminDeleteDto): Promise<ResponseMessage> {
    return this.adminService.deleteMany(data.ids);
  }
}
