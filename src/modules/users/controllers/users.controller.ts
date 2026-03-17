import { Controller, Get, Patch, Body, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators';
import { type AuthenticatedUser } from '../../../common/interfaces';
import { ResponseMessage } from '../../../common/types';
import { UpdateUserDto, UpdatePasswordDto } from '../dtos';
import { UserProfileOutput } from '../types';
import { UsersService } from '../services';
import {
  MessageResponseDto,
  BadRequestErrorResponse,
  NotFoundErrorResponse,
  UnauthorizedErrorResponse,
  ValidationErrorResponse,
} from '../../../common/swagger/responses';
import { UserProfileResponseDto } from '../dtos/doc.swagger';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the authenticated user profile',
    type: UserProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found', type: NotFoundErrorResponse })
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserProfileOutput> {
    return this.usersService.getUserById(user.userId);
  }

  @Patch('/me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile (name, email, photoUrl)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile updated successfully', type: MessageResponseDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No fields provided to update',
    type: BadRequestErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed', type: ValidationErrorResponse })
  async updateMe(@CurrentUser() user: AuthenticatedUser, @Body() inp: UpdateUserDto): Promise<ResponseMessage> {
    return this.usersService.updateProfile(user.userId, inp);
  }

  @Patch('/me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for the current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Password updated successfully', type: MessageResponseDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid current password or validation failed',
    type: BadRequestErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found', type: NotFoundErrorResponse })
  async updatePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() inp: UpdatePasswordDto,
  ): Promise<ResponseMessage> {
    return this.usersService.updatePassword(user.userId, inp);
  }

  @Delete('/me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete the current user account permanently' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Account deleted successfully', type: MessageResponseDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
    type: UnauthorizedErrorResponse,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found', type: NotFoundErrorResponse })
  async deleteMe(@CurrentUser() user: AuthenticatedUser): Promise<ResponseMessage> {
    return this.usersService.remove(user.userId);
  }
}
