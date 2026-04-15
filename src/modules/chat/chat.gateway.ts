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
import { Inject, UseGuards } from '@nestjs/common';
import { ChatService } from './services/chat.service';
import { MessageService } from '../message/services/message.service';
import { APP_LOGGER } from '../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../shared/logger/interfaces/interface';
import { SocketService } from '../socket/socket.service';
import { SocketAuthGuard } from '../../common/guards';
import type { AuthenticatedSocket } from '../../common/guards/socket-auth.guard';
import { TokensService } from '../security/services';
import { PublicRoute } from '../../common/decorators';
import { type MessageWithSenderAndFiles } from '../message/types';
import { Server } from 'socket.io';
import { extractSocketToken } from '../../common/utils/extract-socket-token';
import { UserRoles } from '@prisma/client';

const wsOrigins = (process.env.WS_CORS_ALLOW_ORIGIN || process.env.CORS_ALLOW_ORIGIN || 'http://localhost:3001')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

type GatewaySuccess = { success: true };
type GatewayFailure = { success: false; error: string };
type GatewayResult = GatewaySuccess | GatewayFailure;
type ChatActionGatewayResult = GatewayResult & { chatId?: string };
type MessageGatewayResult = GatewayResult & { message?: MessageWithSenderAndFiles };

@PublicRoute()
@UseGuards(SocketAuthGuard)
@WebSocketGateway({
  cors: {
    origin: wsOrigins,
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
      const userId = await this.getAuthenticatedUserId(client);

      this.socketService.trackConnection(this.namespace, userId, client.id);

      this.logger.info('Client connected', { userId, socketId: client.id });

      // Notify user of successful connection
      client.emit('connected', { userId, socketId: client.id });
    } catch (error: unknown) {
      this.logger.error('Error handling connection', {
        error: error instanceof Error ? error : String(error),
        socketId: client.id,
      });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
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
  ): Promise<ChatActionGatewayResult> {
    try {
      const userId = await this.getAuthenticatedUserId(client);
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
    } catch (error: unknown) {
      this.logger.error('Error joining chat', {
        error: error instanceof Error ? error : String(error),
        userId: client.userId,
      });
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  @SubscribeMessage('chat:leave')
  async handleLeaveChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ): Promise<ChatActionGatewayResult> {
    try {
      const userId = await this.getAuthenticatedUserId(client);
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
    } catch (error: unknown) {
      this.logger.error('Error leaving chat', {
        error: error instanceof Error ? error : String(error),
        userId: client.userId,
      });
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; content?: string },
  ): Promise<MessageGatewayResult> {
    try {
      const userId = await this.getAuthenticatedUserId(client);
      const { chatId, content = '' } = data;

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
    } catch (error: unknown) {
      this.logger.error('Error sending message', {
        error: error instanceof Error ? error : String(error),
        userId: client.userId,
      });
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  @SubscribeMessage('message:edit')
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; newContent: string; chatId: string },
  ): Promise<MessageGatewayResult> {
    try {
      const userId = await this.getAuthenticatedUserId(client);
      const role = (client.userRole as UserRoles | undefined) ?? UserRoles.USER;
      const { messageId, newContent, chatId } = data;

      // Edit message via service
      const message = await this.messageService.editMessage({
        messageId,
        userId,
        role,
        newContent,
      });

      // Broadcast to all users in the chat room
      this.socketService.emitToRoom(this.namespace, `chat:${chatId}`, 'message:edited', {
        message,
        chatId,
      });

      this.logger.info('Message edited via WebSocket', { userId, messageId, chatId });

      return { success: true, message };
    } catch (error: unknown) {
      this.logger.error('Error editing message', {
        error: error instanceof Error ? error : String(error),
        userId: client.userId,
      });
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; chatId: string },
  ): Promise<GatewayResult> {
    try {
      const userId = await this.getAuthenticatedUserId(client);
      const role = (client.userRole as UserRoles | undefined) ?? UserRoles.USER;
      const { messageId, chatId } = data;

      // Delete message via service
      await this.messageService.deleteMessage(messageId, userId, role);

      // Broadcast to all users in the chat room
      this.socketService.emitToRoom(this.namespace, `chat:${chatId}`, 'message:deleted', {
        messageId,
        chatId,
        timestamp: new Date().toISOString(),
      });

      this.logger.info('Message deleted via WebSocket', { userId, messageId, chatId });

      return { success: true };
    } catch (error: unknown) {
      this.logger.error('Error deleting message', {
        error: error instanceof Error ? error : String(error),
        userId: client.userId,
      });
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  @SubscribeMessage('chat:typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string; isTyping: boolean },
  ): Promise<GatewayResult> {
    try {
      const userId = await this.getAuthenticatedUserId(client);
      const { chatId, isTyping } = data;

      // Broadcast typing indicator to others in the chat (exclude sender)
      client.to(`chat:${chatId}`).emit('user:typing', {
        userId,
        chatId,
        isTyping,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error: unknown) {
      this.logger.error('Error handling typing indicator', {
        error: error instanceof Error ? error : String(error),
        userId: client.userId,
      });
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  @SubscribeMessage('chat:read')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { chatId: string },
  ): Promise<GatewayResult> {
    try {
      const userId = await this.getAuthenticatedUserId(client);
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
    } catch (error: unknown) {
      this.logger.error('Error marking chat as read', {
        error: error instanceof Error ? error : String(error),
        userId: client.userId,
      });
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  private async getAuthenticatedUserId(client: AuthenticatedSocket): Promise<string> {
    if (client.userId) {
      return client.userId;
    }

    const token = extractSocketToken(client);
    if (!token) {
      throw new Error('Unauthorized');
    }

    const payload = await this.tokensService.verifyAccess(token);
    if (!payload?.sub) {
      throw new Error('Unauthorized');
    }

    client.userId = payload.sub;
    client.userRole = payload.role;

    return client.userId;
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
