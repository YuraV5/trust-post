export interface ISessionsPolicy {
  prepareForLogin(userId: string, deviceId: string): Promise<void>;
}
