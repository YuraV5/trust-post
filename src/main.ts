import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupGlobalSettings } from './app/server';
import { ConfigService } from '@nestjs/config/dist/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  setupGlobalSettings(app, config);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
