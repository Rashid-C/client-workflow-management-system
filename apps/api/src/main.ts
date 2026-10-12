import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // The browser reaches the API through the web app's /api rewrite, so the
  // client IP arrives in X-Forwarded-For from that proxy. Set TRUST_PROXY to
  // the proxy's address in production (Express "trust proxy" syntax).
  app.set('trust proxy', process.env['TRUST_PROXY'] ?? 'loopback');

  // Run onApplicationShutdown hooks (e.g. closing the Postgres pool) on SIGTERM.
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: 0, // VersioningType.URI
    defaultVersion: '1',
  });

  // No CORS: browsers call the API same-origin through the web app's /api
  // rewrite, which keeps the session cookie first-party.

  await app.listen(process.env.PORT ?? 3001);
}

await bootstrap();
