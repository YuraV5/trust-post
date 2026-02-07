import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { MessageResponse } from '../../common/types';
import { UserOutput } from './types';
import { CreateUserDto, UpdatePasswordDto, UpdateUserDto } from './dtos';

// TODO add auth guards and decorators
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/me')
  async getMe(): Promise<UserOutput> {
    return this.usersService.findById('some-user-id');
  }

  @Patch('/me')
  async updateMe(@Body() inp: UpdateUserDto): Promise<MessageResponse> {
    return this.usersService.update('some-user-id', inp);
  }

  @Patch('/me/password')
  async updatePassword(@Body() inp: UpdatePasswordDto): Promise<MessageResponse> {
    return this.usersService.updatePassword('some-user-id', inp);
  }

  @Post('/create')
  async create(@Body() inp: CreateUserDto): Promise<MessageResponse> {
    return this.usersService.create(inp);
  }

  @Delete('/me')
  async deleteMe(): Promise<MessageResponse> {
    return this.usersService.remove('some-user-id');
  }
}
