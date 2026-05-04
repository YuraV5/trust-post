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
import { Inject, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
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
import { WsChatActionDto, WsDeleteMessageDto, WsEditMessageDto, WsSendMessageDto, WsTypingDto } from './dtos';

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

      // Join a personal room so emitToUser() reaches this socket from any pod.
      // Socket.IO removes the socket from all rooms automatically on disconnect.
      await client.join(`user:${userId}`);

      this.logger.info('Client connected', { userId, socketId: client.id });
      // Tell the connecting client its own userId and socketId so the UI
      // doesn't have to decode the JWT itself.
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
      this.logger.info('Client disconnected', { userId, socketId: client.id });
    }
  }

  @SubscribeMessage('chat:join')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async handleJoinChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: WsChatActionDto,
  ): Promise<ChatActionGatewayResult> {
    try {
      const userId = await this.getAuthenticatedUserId(client);
      const { chatId } = data;

      // Verify user is member of chat
      await this.chatService.getChat(chatId, userId);

      // Add this socket to the Socket.IO room so it receives room broadcasts.
      await client.join(`chat:${chatId}`);

      this.logger.info('User joined chat room', { userId, chatId, socketId: client.id });

      // client.to() sends to everyone in the room EXCEPT the sender.
      // We don't need to notify the joining user about themselves.
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
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async handleLeaveChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: WsChatActionDto,
  ): Promise<ChatActionGatewayResult> {
    try {
      const userId = await this.getAuthenticatedUserId(client);
      const { chatId } = data;

      // Verify user is a member before broadcasting leave activity.
      await this.chatService.getChat(chatId, userId);

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
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: WsSendMessageDto,
  ): Promise<MessageGatewayResult> {
    try {
      const userId = await this.getAuthenticatedUserId(client);
      const { chatId, content = '' } = data;

      // Send message via service
      // The service handles both DB write and broadcasting message:new to the room,
      // so we don't emit anything here — avoiding a duplicate event for the sender.
      const message = await this.messageService.sendMessage({
        chatId,
        senderId: userId,
        content,
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
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: WsEditMessageDto,
  ): Promise<MessageGatewayResult> {
    try {
      const userId = await this.getAuthenticatedUserId(client);
      const role = (client.userRole as UserRoles | undefined) ?? UserRoles.USER;
      const { messageId, newContent } = data;

      // Edit message via service.
      // The service handles DB write and broadcasts message:edited to the room,
      // so both WS and REST edits notify all chat members consistently.
      const message = await this.messageService.editMessage({
        messageId,
        userId,
        role,
        newContent,
      });

      this.logger.info('Message edited via WebSocket', { userId, messageId, chatId: message.chatId });

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
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: WsDeleteMessageDto,
  ): Promise<GatewayResult> {
    try {
      const userId = await this.getAuthenticatedUserId(client);
      const role = (client.userRole as UserRoles | undefined) ?? UserRoles.USER;

      const { messageId } = data;

      // Delete message via service
      await this.messageService.deleteMessage(messageId, userId, role);

      this.logger.info('Message deleted via WebSocket', { userId, messageId });

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
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: WsTypingDto,
  ): Promise<GatewayResult> {
    try {
      const userId = await this.getAuthenticatedUserId(client);
      const { chatId, isTyping } = data;

      // Verify user is a member before broadcasting typing activity.
      await this.chatService.getChat(chatId, userId);

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
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: WsChatActionDto,
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
    // Fast path: SocketAuthGuard already decoded the token on connect and
    // stored userId on the socket object — no need to verify again.
    if (client.userId) {
      return client.userId;
    }

    // Fallback for edge cases where the guard didn't run (e.g. reconnect race).
    // We decode manually and cache the result on the socket for next calls.
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
