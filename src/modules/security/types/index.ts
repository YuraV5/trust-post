export type AccessPayload = {
  sub: string;
  role: string;
};

export type RefreshPayload = {
  sub: string;
  sessionId: string;
};
