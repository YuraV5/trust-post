import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupGlobalSettings } from './app/server';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { APP_LOGGER, AppLogger } from './shared/logger/services/app-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  setupGlobalSettings(app, config);

  await app.listen(config.get<number>('PORT') || 3001, () => {
    const logger = app.get<AppLogger>(APP_LOGGER);
    logger.info(`Server is running on PORT:${config.get<number>('PORT')}`);
  });
}
void bootstrap();
