export type UserSession = {
  sessionId: string;
  userId: string;
  refreshTokenHash: string;
  deviceId: string;
  userAgent: string;
  ip: string;
  expiresAt: Date;
};

export type SessionMapping = {
  id: string;
  deviceId: string;
  userAgent: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  ip: string;
};
