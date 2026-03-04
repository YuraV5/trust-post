import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Roles, CurrentUser } from '../../../common/decorators';
import { RolesGuard } from '../../../common/guards';
import { UserRoles } from '@prisma/client';
import { UsersService } from '../services';
import { UUIDParamDto } from '../../../common/dtos/req-params.dto';
import { UserAdminOutput } from '../types';
import { MessageResponse } from '../../../common/types';
import { UpdateRolesDto, AdminUsersQueryDto, AdminDeleteDto, AdminUserCreationDto } from '../dtos';
import { PaginatedResult } from '../types/paginated';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { UserRolePeriodOutput } from '../../user-role-periods/types';

@UseGuards(RolesGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(UserRoles.ADMIN)
  @Get()
  async getAllUsers(@Query() query: AdminUsersQueryDto): Promise<PaginatedResult<UserAdminOutput>> {
    return await this.usersService.findAllForAdmin(query);
  }

  @Roles(UserRoles.ADMIN)
  @Post()
  async createUser(
    @Body() inp: AdminUserCreationDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<MessageResponse> {
    return await this.usersService.createUserByAdmin(inp, currentUser.userId);
  }

  @Roles(UserRoles.ADMIN)
  @Get('/:id')
  async getUserById(@Param() params: UUIDParamDto): Promise<UserAdminOutput> {
    return await this.usersService.findByIdForAdmin(params.id);
  }

  @Roles(UserRoles.ADMIN)
  @Get('/:id/toggle-status')
  async updateStatus(@Param() params: UUIDParamDto): Promise<MessageResponse> {
    return await this.usersService.updateStatus(params.id);
  }

  @Roles(UserRoles.ADMIN)
  @Patch('/:id/roles')
  async updateUserRoles(
    @Param() params: UUIDParamDto,
    @Body() data: UpdateRolesDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<MessageResponse> {
    return await this.usersService.changeRoles(params.id, currentUser.userId, data.role);
  }

  @Roles(UserRoles.ADMIN)
  @Get('/:id/role-history')
  async getUserRoleHistory(@Param() params: UUIDParamDto): Promise<UserRolePeriodOutput[]> {
    return await this.usersService.getUserRoleHistory(params.id);
  }

  @Roles(UserRoles.ADMIN)
  @Delete()
  async deleteUser(@Body() data: AdminDeleteDto): Promise<MessageResponse> {
    return await this.usersService.deleteMany(data.ids);
  }
}
