import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { ConfigModule } from '@nestjs/config';
import { APP_NODE_MODE } from '../../common/consts';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT', 6379),
          password:
            config.get<string>('nodeEnv') === APP_NODE_MODE.PROD ? config.get<string>('REDIS_PASSWORD') : undefined,
        },
      }),
    }),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class QueuesModule {}
