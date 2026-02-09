import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { setupSwagger } from './setup/swagger';

export function setupGlobalSettings(app: INestApplication, config: ConfigService): void {
  // Set global API prefix
  app.setGlobalPrefix('api');

  // Trust proxy settings for correct client IP and protocol handling
  // app.set('trust proxy', true);

  // CORS configuration
  app.enableCors({
    origin: config.get<string>('corsAllowOrigin'),
    credentials: true,
  });

  // Security and parsing middlewares
  app.use(helmet());
  app.use(cookieParser());
  app.use(json({ limit: '3mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // Enable API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Setup Swagger documentation
  setupSwagger(app);

  app.enableShutdownHooks();
}
