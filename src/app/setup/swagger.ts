import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const configSwagger = new DocumentBuilder()
    .setTitle('Task Flow Service')
    .setDescription('The task management API description')
    .setVersion('1.0')
    .addTag('trust post service')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT-auth')
    .addGlobalResponse({
      status: 500,
      description: 'Internal server error',
    })
    .build();

  const documentFactory = (): OpenAPIObject =>
    SwaggerModule.createDocument(app, configSwagger, { autoTagControllers: true });

  SwaggerModule.setup('docs', app, documentFactory);
}
