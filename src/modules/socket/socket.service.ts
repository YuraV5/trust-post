import { Inject, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { APP_LOGGER } from '../../shared/logger/services/app-logger';
import { type IAppLogger } from '../../shared/logger/interfaces/interface';

type NamespaceKey = string;

@Injectable()
export class SocketService {
  constructor(@Inject(APP_LOGGER) private readonly logger: IAppLogger) {}

  // Saving Socket.IO servers for each namespace (chat, notifications, etc.)
  private readonly servers = new Map<NamespaceKey, Server>();

  // Register a namespace server to enable emitting events from any service.
  registerNamespace(namespace: NamespaceKey, server: Server): void {
    this.servers.set(namespace, server);
  }

  // Unregister a namespace server and remove associated data from memory.
  unregisterNamespace(namespace: NamespaceKey): void {
    this.servers.delete(namespace);
  }

  // Helper method: extracts userId from handshake (query or auth).
  // Currently flexible to allow the frontend to pass userId in different ways.
  extractUserId(client: Socket): string | null {
    const queryUserId = client.handshake.query.userId;
    const authUserId = (client.handshake.auth as Record<string, unknown> | undefined)?.userId;

    const value = (queryUserId ?? authUserId) as string | undefined;
    if (!value || typeof value !== 'string') return null;

    return value.trim() || null;
  }

  // Sends an event to all active sockets of a specific user.
  // Each user socket joins a personal room "user:<userId>" on connection,
  // so this call works across multiple app instances via the Redis adapter.
  emitToUser(namespace: NamespaceKey, userId: string, event: string, payload: unknown): void {
    const server = this.servers.get(namespace);
    if (!server) return;
    server.to(`user:${userId}`).emit(event, payload);
  }

  // Sends an event to a specific room within a namespace.
  emitToRoom(namespace: NamespaceKey, room: string, event: string, payload: unknown): void {
    const server = this.servers.get(namespace);
    if (!server) {
      this.logger.warn('Socket emitToRoom skipped: namespace server is not registered', {
        namespace,
        room,
        event,
      });
      return;
    }
    server.to(room).emit(event, payload);
  }

  // Broadcasts an event to all connected clients within a namespace.
  emitToNamespace(namespace: NamespaceKey, event: string, payload: unknown): void {
    const server = this.servers.get(namespace);
    if (!server) {
      this.logger.warn('Socket emitToNamespace skipped: namespace server is not registered', {
        namespace,
        event,
      });
      return;
    }
    server.emit(event, payload);
  }
}
