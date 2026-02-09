import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { SessionsService } from './services/sessions.service';
import { RefreshTokenGuard } from '../../../common/guards';
import { CurrentUser } from '../../../common/decorators';
import type { RefreshTokenUser } from '../../../common/interfaces';
import { SessionMapping } from './types';
import { MessageResponse } from '../../../common/types';

@UseGuards(RefreshTokenGuard)
@Controller('auth/sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('me')
  async getMySessions(@CurrentUser() user: RefreshTokenUser): Promise<SessionMapping[]> {
    return this.sessionsService.getMySessions(user.userId);
  }

  @Delete('all')
  async deleteAllSessions(@CurrentUser() user: RefreshTokenUser): Promise<MessageResponse> {
    return await this.sessionsService.deleteAllSessions(user.userId);
  }

  @Delete('all-except-current')
  async deleteAllExceptCurrentSession(@CurrentUser() user: RefreshTokenUser): Promise<MessageResponse> {
    return await this.sessionsService.deleteAllExceptCurrentSession(user.userId, user.sessionId);
  }

  @Delete(':sessionId')
  async deleteSession(
    @CurrentUser() user: RefreshTokenUser,
    @Param('sessionId') sessionId: string,
  ): Promise<MessageResponse> {
    return await this.sessionsService.deleteBySessionId(sessionId);
  }
}
