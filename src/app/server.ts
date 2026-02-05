import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { setupSwagger } from './setup/swagger';

export function setupGlobalSettings(app: INestApplication, config: ConfigService): void {
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: config.get<string>('corsAllowOrigin'),
    credentials: true,
  });

  app.use(helmet());
  app.use(cookieParser());
  app.use(json({ limit: '3mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  setupSwagger(app);

  app.enableShutdownHooks();
}
