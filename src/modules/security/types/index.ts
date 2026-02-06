export type AccessPayload = {
  sub: string;
  roles: string[];
};

export type RefreshPayload = {
  sub: string;
  sessionId?: string;
};
