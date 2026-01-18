import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';


async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests without origin (like from Postman)
      if (!origin) return callback(null, true);

      // Optionally validate the origin against a list if needed
      // if (allowedDomains.includes(origin)) { ... }

      callback(null, true); // reflect the request origin
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use(cookieParser());

  await app.listen(process.env.PORT || 8001);

  logger.log(`Application is running on: http://localhost:8001`);
  logger.log(`Swagger UI available at: http://localhost:8001/docs#`);
}

bootstrap();