import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

type NamespaceKey = string;

@Injectable()
export class SocketService {
  // Saving Socket.IO servers for each namespace (chat, notifications, etc.)
  private readonly servers = new Map<NamespaceKey, Server>();

  // Structure for quick access: namespace -> userId -> set(socketId)
  // This allows a single user to have multiple active tabs/devices.
  private readonly userSocketsByNamespace = new Map<NamespaceKey, Map<string, Set<string>>>();

  // Register a namespace server to enable emitting events from any service.
  registerNamespace(namespace: NamespaceKey, server: Server): void {
    this.servers.set(namespace, server);
    if (!this.userSocketsByNamespace.has(namespace)) {
      this.userSocketsByNamespace.set(namespace, new Map<string, Set<string>>());
    }
  }

  // Unregister a namespace server and remove associated data from memory.
  unregisterNamespace(namespace: NamespaceKey): void {
    this.servers.delete(namespace);
    this.userSocketsByNamespace.delete(namespace);
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

  // Register a new user connection (adds a new socketId to their set).
  trackConnection(namespace: NamespaceKey, userId: string, socketId: string): void {
    const usersMap = this.ensureUsersMap(namespace);
    const socketIds = usersMap.get(userId) ?? new Set<string>();
    socketIds.add(socketId);
    usersMap.set(userId, socketIds);
  }

  // Remove a specific connection; if no connections remain, remove the userId.
  trackDisconnection(namespace: NamespaceKey, userId: string, socketId: string): void {
    const usersMap = this.userSocketsByNamespace.get(namespace);
    if (!usersMap) return;

    const socketIds = usersMap.get(userId);
    if (!socketIds) return;

    socketIds.delete(socketId);
    if (socketIds.size === 0) {
      usersMap.delete(userId);
    }
  }

  // Sends an event to a specific user on all their active sockets.
  emitToUser(namespace: NamespaceKey, userId: string, event: string, payload: unknown): void {
    const server = this.servers.get(namespace);
    const usersMap = this.userSocketsByNamespace.get(namespace);
    if (!server || !usersMap) return;

    const socketIds = usersMap.get(userId);
    if (!socketIds) return;

    for (const socketId of socketIds) {
      server.to(socketId).emit(event, payload);
    }
  }

  // Sends an event to a specific room within a namespace.
  emitToRoom(namespace: NamespaceKey, room: string, event: string, payload: unknown): void {
    const server = this.servers.get(namespace);
    if (!server) return;
    server.to(room).emit(event, payload);
  }

  // Broadcasts an event to all connected clients within a namespace.
  emitToNamespace(namespace: NamespaceKey, event: string, payload: unknown): void {
    const server = this.servers.get(namespace);
    if (!server) return;
    server.emit(event, payload);
  }

  // Ensures that the user map for a namespace exists.
  private ensureUsersMap(namespace: NamespaceKey): Map<string, Set<string>> {
    const existing = this.userSocketsByNamespace.get(namespace);
    if (existing) return existing;

    const created = new Map<string, Set<string>>();
    this.userSocketsByNamespace.set(namespace, created);
    return created;
  }
}
