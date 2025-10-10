/* eslint-disable prettier/prettier */

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  });

  app.useStaticAssets(join(__dirname, '..', 'public'), { prefix: '/public/' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('API de Gestión de Usuarios')
    .setDescription('API para gestionar usuarios con autenticación JWT')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);

  // Swagger UI clásico (puedes dejarlo o quitarlo)
  SwaggerModule.setup('docs', app, doc, {
    jsonDocumentUrl: '/docs-json',
  });

  // Scalar - Documentación moderna
  const { apiReference } = await import('@scalar/nestjs-api-reference');
  app.use(
    '/reference',
    apiReference({
      theme: 'purple',
      url: '/docs-json',
    } as any),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
