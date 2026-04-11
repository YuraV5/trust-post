import { IRedisService } from "../../src/modules/cache/interfaces";

export const mockRedisService: IRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  ttl: jest.fn(),
  exists: jest.fn(),
  flushDb: jest.fn(),
  setIfNotExists: jest.fn(),
} 