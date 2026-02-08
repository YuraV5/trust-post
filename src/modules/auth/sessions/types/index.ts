export type UserSession = {
  userId: string;
  refreshTokenHash: string;
  deviceId: string;
  deviceName?: string;
  userAgent?: string;
  ip?: string;
  expiresAt: Date;
};

export type SessionMapping = {
  id: string;
  deviceName?: string;
  userAgent?: string;
  lastUsedAt: Date | null;
  createdAt: Date;
};
