import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, UseGuards } from '@nestjs/common';
import { ChatService } from './services/chat.service';
import { MessageService } from '../message/services/message.service';
import { APP_LOGGER } from '../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../shared/logger/intefaces/interface';
import { SocketService } from '../socket/socket.service';
import { SocketAuthGuard } from '../../common/guards';
import { TokensService } from '../security/services';
import { PublicRoute } from '../../common/decorators';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@PublicRoute()
@UseGuards(SocketAuthGuard)
@WebSocketGateway({
  cors: {
    origin: '*', // Configure this properly in production
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private readonly namespace = 'chat';

  constructor(
    @Inject(APP_LOGGER) private readonly logger: IAppLogger,
    private readonly chatService: ChatService,
    private readonly messageService: MessageService,
    private readonly socketService: SocketService,
    private readonly tokensService: TokensService,
  ) {}

  afterInit(server: Server): void {
    this.socketService.registerNamespace(this.namespace, server);
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn('Client connection rejected - no token', { socketId: client.id });
        client.disconnect();
        return;
      }

      const payload = await this.tokensService.verifyAccess(token);
      const userId = payload.sub;

      if (!userId) {
        this.logger.warn('Client connection rejected - no userId', { socketId: client.id });
        client.disconnect();
        return;
      }

      client.userId = userId;
      client.userRole = payload.role;
      this.socketService.trackConnection(this.namespace, userId, client.id);

      this.logger.info('Client connected', { userId, socketId: client.id });

      // Notify user of successful connection
      client.emit('connected', { userId, socketId: client.id });
    } catch (error) {
      this.logger.error('Error handling connection', { error });
      client.disconnect();
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

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const userId = client.userId;

    if (userId) {
      this.socketService.trackDisconnection(this.namespace, userId, client.id);

      this.logger.info('Client disconnected', { userId, socketId: client.id });
    }
  }

  @SubscribeMessage('chat:join')
  async handleJoinChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ): Promise<{ success: boolean; chatId?: string; error?: string }> {
    try {
      const userId = client.userId!;
      const { chatId } = data;

      // Verify user is member of chat
      await this.chatService.getChat(chatId, userId);

      // Join Socket.IO room for this chat
      await client.join(`chat:${chatId}`);

      this.logger.info('User joined chat room', { userId, chatId, socketId: client.id });

      // Notify others in the chat
      client.to(`chat:${chatId}`).emit('user:joined', {
        userId,
        chatId,
        timestamp: new Date().toISOString(),
      });

      return { success: true, chatId };
    } catch (error) {
      this.logger.error('Error joining chat', { error, userId: client.userId });
      return { success: false, error: (error as Error).message };
    }
  }

  @SubscribeMessage('chat:leave')
  async handleLeaveChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ): Promise<{ success: boolean; chatId?: string; error?: string }> {
    try {
      const userId = client.userId!;
      const { chatId } = data;

      // Leave Socket.IO room
      await client.leave(`chat:${chatId}`);

      this.logger.info('User left chat room', { userId, chatId, socketId: client.id });

      // Notify others in the chat
      client.to(`chat:${chatId}`).emit('user:left', {
        userId,
        chatId,
        timestamp: new Date().toISOString(),
      });

      return { success: true, chatId };
    } catch (error) {
      this.logger.error('Error leaving chat', { error, userId: client.userId });
      return { success: false, error: (error as Error).message };
    }
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; content: string },
  ): Promise<{ success: boolean; message?: any; error?: string }> {
    try {
      const userId = client.userId!;
      const { chatId, content } = data;

      // Send message via service
      const message = await this.messageService.sendMessage({
        chatId,
        senderId: userId,
        content,
      });

      // Broadcast to all users in the chat room
      this.socketService.emitToRoom(this.namespace, `chat:${chatId}`, 'message:new', {
        message,
        chatId,
      });

      this.logger.info('Message sent via WebSocket', {
        userId,
        chatId,
        messageId: message.id,
      });

      return { success: true, message };
    } catch (error) {
      this.logger.error('Error sending message', { error, userId: client.userId });
      return { success: false, error: (error as Error).message };
    }
  }

  @SubscribeMessage('message:edit')
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; newContent: string; chatId: string },
  ): Promise<{ success: boolean; message?: any; error?: string }> {
    try {
      const userId = client.userId!;
      const { messageId, newContent, chatId } = data;

      // Edit message via service
      const message = await this.messageService.editMessage({
        messageId,
        userId,
        newContent,
      });

      // Broadcast to all users in the chat room
      this.socketService.emitToRoom(this.namespace, `chat:${chatId}`, 'message:edited', {
        message,
        chatId,
      });

      this.logger.info('Message edited via WebSocket', { userId, messageId, chatId });

      return { success: true, message };
    } catch (error) {
      this.logger.error('Error editing message', { error, userId: client.userId });
      return { success: false, error: (error as Error).message };
    }
  }

  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; chatId: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const userId = client.userId!;
      const { messageId, chatId } = data;

      // Delete message via service
      await this.messageService.deleteMessage(messageId, userId);

      // Broadcast to all users in the chat room
      this.socketService.emitToRoom(this.namespace, `chat:${chatId}`, 'message:deleted', {
        messageId,
        chatId,
        timestamp: new Date().toISOString(),
      });

      this.logger.info('Message deleted via WebSocket', { userId, messageId, chatId });

      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting message', { error, userId: client.userId });
      return { success: false, error: (error as Error).message };
    }
  }

  @SubscribeMessage('chat:typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; isTyping: boolean },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const userId = client.userId!;
      const { chatId, isTyping } = data;

      // Broadcast typing indicator to others in the chat (exclude sender)
      client.to(`chat:${chatId}`).emit('user:typing', {
        userId,
        chatId,
        isTyping,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error handling typing indicator', { error, userId: client.userId });
      return { success: false, error: (error as Error).message };
    }
  }

  @SubscribeMessage('chat:read')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const userId = client.userId!;
      const { chatId } = data;

      // Mark as read via service
      await this.messageService.markAsRead(chatId, userId);

      // Notify others in the chat that user has read messages
      client.to(`chat:${chatId}`).emit('chat:read', {
        userId,
        chatId,
        timestamp: new Date().toISOString(),
      });

      this.logger.info('Chat marked as read via WebSocket', { userId, chatId });

      return { success: true };
    } catch (error) {
      this.logger.error('Error marking chat as read', { error, userId: client.userId });
      return { success: false, error: (error as Error).message };
    }
  }

  // Helper method to emit events to specific users
  emitToUser(userId: string, event: string, data: unknown): void {
    this.socketService.emitToUser(this.namespace, userId, event, data);
  }

  // Helper method to emit events to all members of a chat
  emitToChat(chatId: string, event: string, data: unknown): void {
    this.socketService.emitToRoom(this.namespace, `chat:${chatId}`, event, data);
  }
}
