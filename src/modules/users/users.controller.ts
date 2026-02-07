import { Body, Controller, Delete, Get, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { MessageResponse } from '../../common/types';
import { UserOutput } from './types';
import { UpdatePasswordDto, UpdateUserDto } from './dtos';
import { CurrentUser } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/interfaces';

// TODO add auth guards and decorators
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/me')
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserOutput> {
    return this.usersService.findById(user.userId);
  }

  @Patch('/me')
  async updateMe(@CurrentUser() user: AuthenticatedUser, @Body() inp: UpdateUserDto): Promise<MessageResponse> {
    return this.usersService.update(user.userId, inp);
  }

  @Patch('/me/password')
  async updatePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() inp: UpdatePasswordDto,
  ): Promise<MessageResponse> {
    return this.usersService.updatePassword(user.userId, inp);
  }

  @Delete('/me')
  async deleteMe(@CurrentUser() user: AuthenticatedUser): Promise<MessageResponse> {
    return this.usersService.remove(user.userId);
  }
}
