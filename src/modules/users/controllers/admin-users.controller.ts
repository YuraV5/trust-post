import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../../common/decorators';
import { RolesGuard } from '../../../common/guards';
import { UserRoles } from '@prisma/client';
import { UsersService } from '../services';
import { IdParamDto } from '../../../common/dtos/req-params.dto';
import { UserAdminOutput } from '../types';
import { MessageResponse } from '../../../common/types';
import { CreateUserDto, UpdateRolesDto, UpdateStatusDto } from '../dtos';

@UseGuards(RolesGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(UserRoles.ADMIN)
  @Get()
  async getAllUsers() {}

  @Roles(UserRoles.ADMIN)
  @Get(':id')
  async getUserById(@Param() params: IdParamDto): Promise<UserAdminOutput> {
    return await this.usersService.findByIdForAdmin(params.id);
  }

  @Roles(UserRoles.ADMIN)
  @Post(':id/status')
  async updateStatus(@Param() params: IdParamDto, @Body() data: UpdateStatusDto): Promise<MessageResponse> {
    await this.usersService.updateStatus(params.id, data.isActive);
    return { message: `User ${data.isActive ? 'enabled' : 'disabled'} successfully` };
  }

  @Roles(UserRoles.ADMIN)
  @Post()
  async createUser(@Body() inp: CreateUserDto): Promise<MessageResponse> {
    await this.usersService.create(inp);
    return { message: `User created successfully` };
  }

  @Roles(UserRoles.ADMIN)
  @Patch(':id/roles')
  async updateUserRoles(@Param() params: IdParamDto, @Body() data: UpdateRolesDto): Promise<MessageResponse> {
    await this.usersService.changeRoles(params.id, data.role);
    return { message: `User roles updated successfully` };
  }

  @Roles(UserRoles.ADMIN)
  @Delete(':id')
  async deleteUser(@Param() params: IdParamDto): Promise<MessageResponse> {
    await this.usersService.remove(params.id);
    return { message: `User deleted successfully` };
  }
}
