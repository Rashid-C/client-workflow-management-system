
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: 0,// VersioningType.URI
    defaultVersion: '1',
  });

  app.enableCors({
    origin: 'http://localhost:3000',
  });

  await app.listen(process.env.PORT ?? 3001);
}

await bootstrap();
