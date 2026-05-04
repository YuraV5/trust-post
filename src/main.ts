import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupGlobalSettings } from './app/server';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { APP_LOGGER } from './shared/logger/services/app-logger';
import { IAppLogger } from './shared/logger/interfaces/interface';
import { RedisIoAdapter } from './infrastructure/socket/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  const config = app.get(ConfigService);
  setupGlobalSettings(app, config);

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  await app.listen(config.get<number>('PORT') || 3001, () => {
    const logger = app.get<IAppLogger>(APP_LOGGER);
    logger.info(`Server is running on PORT:${config.get<number>('PORT')}`);
  });
}
void bootstrap();
