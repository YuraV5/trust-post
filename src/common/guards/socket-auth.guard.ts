import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { TokensService } from '../../modules/security/services';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@Injectable()
export class SocketAuthGuard implements CanActivate {
  constructor(private readonly tokensService: TokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<AuthenticatedSocket>();
    const token = this.extractToken(client);

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

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const authToken = auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const headerAuth = client.handshake.headers.authorization;
    if (typeof headerAuth === 'string' && headerAuth.startsWith('Bearer ')) {
      return headerAuth.slice(7).trim();
    }

    const queryToken = client.handshake.query.token;
    if (typeof queryToken === 'string' && queryToken.trim()) {
      return queryToken.trim();
    }

    return null;
  }
}
