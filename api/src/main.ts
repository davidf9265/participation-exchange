import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // The web app runs on a different origin (localhost:3000) and calls this API
  // straight from the browser.
  app.enableCors({ origin: true });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const port = Number(process.env['PORT'] ?? 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`API listening on http://localhost:${port}`);
}

void bootstrap();
