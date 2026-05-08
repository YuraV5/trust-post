import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { ServerOptions } from 'socket.io';
import { REDIS_DB } from '../../configs/redis/redis-db';
import { APP_MODE } from '../../common/consts/node-mode';

/**
 * Extends the default NestJS WebSocket adapter with a Redis pub/sub adapter.
 * This enables Socket.IO events to be broadcast across multiple app instances
 * (horizontal scaling), because each pod publishes events to Redis and all
 * other pods subscribe and forward them to their local sockets.
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(private readonly app: INestApplicationContext) {
    super(app);
  }

  connectToRedis(): void {
    const config = this.app.get(ConfigService);

    const isProd = config.get<string>('nodeEnv') === APP_MODE.PRODUCTION;

    const redisOptions = {
      host: config.get<string>('redis.host', 'localhost'),
      port: config.get<number>('redis.port', 6379),
      password: isProd ? config.get<string>('redis.password') : undefined,
      db: REDIS_DB.SOCKET,
    };

    // pub/sub require two separate Redis connections
    const pubClient = new Redis(redisOptions);
    const subClient = pubClient.duplicate();

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): ReturnType<IoAdapter['createIOServer']> {
    const server: unknown = super.createIOServer(port, options);

    if (isServerWithAdapter(server)) {
      server.adapter(this.adapterConstructor);
    }

    return server as ReturnType<IoAdapter['createIOServer']>;
  }
}

type ServerWithAdapter = {
  adapter: (adapterConstructor: ReturnType<typeof createAdapter>) => void;
};

function isServerWithAdapter(value: unknown): value is ServerWithAdapter {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as { adapter?: unknown };
  return typeof candidate.adapter === 'function';
}
