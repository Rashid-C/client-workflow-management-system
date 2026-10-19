import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { problem, validationMessages } from './common/errors.js';
import helmet from 'helmet';
import { validateEnvironment } from './config/env.js';
import { ProductionExceptionFilter } from './common/production-exception.filter.js';

async function bootstrap() {
  validateEnvironment();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });

  // The browser reaches the API through the web app's /api rewrite, so the
  // client IP arrives in X-Forwarded-For from that proxy. Set TRUST_PROXY to
  // the proxy's address in production (Express "trust proxy" syntax).
  app.set('trust proxy', process.env['TRUST_PROXY'] ?? 'loopback');
  app.use(helmet());
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '1mb' });
  if (process.env['NODE_ENV'] === 'production') app.useGlobalFilters(new ProductionExceptionFilter());

  // Run onApplicationShutdown hooks (e.g. closing the Postgres pool) on SIGTERM.
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException(
          problem('validation_failed', validationMessages(errors).join(' ')),
        ),
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
