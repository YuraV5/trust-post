export interface IRedisService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  ttl(key: string): Promise<number>;
  exists(key: string): Promise<boolean>;
  flushDb(): Promise<void>;
}
