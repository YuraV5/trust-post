import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { TokensService } from '../../modules/security/services';
import { extractSocketToken } from '../utils/extract-socket-token';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@Injectable()
export class SocketAuthGuard implements CanActivate {
  constructor(private readonly tokensService: TokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<AuthenticatedSocket>();
    const token = extractSocketToken(client);

    if (!token) {
      throw new WsException('Unauthorized');
    }

    try {
      const payload = await this.tokensService.verifyAccess(token);
      client.userId = payload.sub;
      client.userRole = payload.role;
      return true;
    } catch {
      throw new WsException('Unauthorized');
    }
  }
}
