import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../../common/decorators';
import { RolesGuard } from '../../../common/guards';
import { UserRoles } from '@prisma/client';
import { UsersService } from '../services';
import { IdParamDto } from '../../../common/dtos/req-params.dto';
import { UserAdminOutput, PaginatedResult } from '../types';
import { MessageResponse } from '../../../common/types';
import { CreateUserDto, UpdateRolesDto, AdminUsersQueryDto, AdminDeleteDto } from '../dtos';

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
  async createUser(@Body() inp: CreateUserDto): Promise<MessageResponse> {
    await this.usersService.createUserByAdmin(inp);
    return { message: `User created successfully` };
  }

  @Roles(UserRoles.ADMIN)
  @Get(':id')
  async getUserById(@Param() params: IdParamDto): Promise<UserAdminOutput> {
    return await this.usersService.findByIdForAdmin(params.id);
  }

  @Roles(UserRoles.ADMIN)
  @Get(':id/toggle-status')
  async updateStatus(@Param() params: IdParamDto): Promise<MessageResponse> {
    const status = await this.usersService.updateStatus(params.id);
    return { message: `Status ${status.isActive ? 'enabled' : 'disabled'} successfully` };
  }

  @Roles(UserRoles.ADMIN)
  @Patch(':id/roles')
  async updateUserRoles(@Param() params: IdParamDto, @Body() data: UpdateRolesDto): Promise<MessageResponse> {
    await this.usersService.changeRoles(params.id, data.role);
    return { message: `User roles updated successfully` };
  }

  @Roles(UserRoles.ADMIN)
  @Delete()
  async deleteUser(@Body() data: AdminDeleteDto): Promise<MessageResponse> {
    await this.usersService.deleteMany(data.ids);
    return { message: `User deleted successfully` };
  }
}
