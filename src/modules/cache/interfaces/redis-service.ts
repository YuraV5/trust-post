export interface IRedisService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  setIfNotExists(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  del(key: string): Promise<void>;
  delByPattern(pattern: string): Promise<number>;
  ttl(key: string): Promise<number>;
  exists(key: string): Promise<boolean>;
  flushDb(): Promise<void>;
}
