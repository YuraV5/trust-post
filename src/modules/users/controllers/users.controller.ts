import { Controller, Get, Patch, Body, Delete } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { ResponseMessage } from '../../../common/types';
import { UpdateUserDto, UpdatePasswordDto } from '../dtos';
import { UserProfileOutput } from '../types';
import { UsersService } from '../services';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/me')
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserProfileOutput> {
    return this.usersService.getUserById(user.userId);
  }

  @Patch('/me')
  async updateMe(@CurrentUser() user: AuthenticatedUser, @Body() inp: UpdateUserDto): Promise<ResponseMessage> {
    return this.usersService.updateProfile(user.userId, inp);
  }

  @Patch('/me/password')
  async updatePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() inp: UpdatePasswordDto,
  ): Promise<ResponseMessage> {
    return this.usersService.updatePassword(user.userId, inp);
  }

  @Delete('/me')
  async deleteMe(@CurrentUser() user: AuthenticatedUser): Promise<ResponseMessage> {
    return this.usersService.remove(user.userId);
  }
}
