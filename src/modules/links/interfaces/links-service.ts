export interface ILinksService {
  generateTemporaryLink(userId: string, keyPrefix: string, ttlSeconds: number): Promise<string>;
}
