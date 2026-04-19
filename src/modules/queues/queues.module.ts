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
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
          password:
            config.get<string>('nodeEnv') === APP_MODE.PRODUCTION ? config.get<string>('redis.password') : undefined,
        },
      }),
    }),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class QueuesModule {}
