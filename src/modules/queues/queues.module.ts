import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';
import { APP_MODE } from '../../common/consts';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = config.get<string>('nodeEnv') ?? process.env.NODE_ENV;
        const isProd = nodeEnv === APP_MODE.PRODUCTION;

        return {
          connection: {
            host: config.get<string>('redis.host', 'localhost'),
            port: config.get<number>('redis.port', 6379),
            password: isProd ? (config.get<string>('redis.password') ?? process.env.REDIS_PASSWORD) : undefined,
          },
        };
      },
    }),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class QueuesModule {}
