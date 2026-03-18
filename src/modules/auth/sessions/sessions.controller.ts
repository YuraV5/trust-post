import { Controller, Delete, Get, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SessionsService } from './services/sessions.service';
import { RefreshTokenGuard } from '../../../common/guards';
import { CurrentUser } from '../../../common/decorators';
import type { RefreshTokenUser } from '../../../common/interfaces';
import { SessionMapping } from './types';
import { ResponseMessage } from '../../../common/types';
import { MessageResponseDto, UnauthorizedErrorResponse } from '../../../common/swagger/responses';

@ApiTags('sessions')
@ApiBearerAuth('JWT-auth')
@UseGuards(RefreshTokenGuard)
@Controller('auth/sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all user sessions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all active sessions for the current user',
    isArray: true,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid refresh token',
    type: UnauthorizedErrorResponse,
  })
  async getMySessions(@CurrentUser() user: RefreshTokenUser): Promise<SessionMapping[]> {
    return this.sessionsService.getMySessions(user.userId);
  }

  @Delete('all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all user sessions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All sessions terminated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid refresh token',
    type: UnauthorizedErrorResponse,
  })
  async deleteAllSessions(@CurrentUser() user: RefreshTokenUser): Promise<ResponseMessage> {
    return await this.sessionsService.deleteAllSessions(user.userId);
  }

  @Delete('all-except-current')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all sessions except the current one' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All other sessions terminated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid refresh token',
    type: UnauthorizedErrorResponse,
  })
  async deleteAllExceptCurrentSession(@CurrentUser() user: RefreshTokenUser): Promise<ResponseMessage> {
    return await this.sessionsService.deleteAllExceptCurrentSession(user.userId, user.sessionId);
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete specific session by ID' })
  @ApiParam({ name: 'sessionId', type: String, description: 'Session ID to delete' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session deleted successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid refresh token',
    type: UnauthorizedErrorResponse,
  })
  async deleteSession(
    @CurrentUser() user: RefreshTokenUser,
    @Param('sessionId') sessionId: string,
  ): Promise<ResponseMessage> {
    return await this.sessionsService.deleteBySessionId(sessionId, user.userId);
  }
}
