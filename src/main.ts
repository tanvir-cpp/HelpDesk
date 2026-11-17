import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { configuration } from './config/configuration';

async function bootstrap() {
  const logger = new Logger('HelpDeskBootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = configuration();

  // Trust proxy in production / docker environments
  app.set('trust proxy', true);

  // Global API Prefix
  app.setGlobalPrefix('api/v1');

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global Guards
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));

  // CORS Configuration
  app.enableCors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('HelpDesk API')
    .setDescription(
      'Full-Stack Support Ticket Management System with Role-Based Access Control (RBAC).\n\n' +
      'Developed by:\n' +
      '- MD TANVIR RAHMAN (Authentication & User Management)\n' +
      '- MD ARAFAT RAHMAN (Ticket Management & Workflow)\n' +
      '- TANBIR RAFAT NABIL (Ticket Comments & Collaboration)',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT Bearer token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication, registration, login, logout, and profile')
    .addTag('Users', 'User management, staff creation, role and status updates (Admin only)')
    .addTag('Tickets', 'Complaint ticket lifecycle, status/priority management, search & filters')
    .addTag('Ticket Comments', 'Threaded comments and communication between clients and support staff')
    .addTag('Ticket Activities', 'Immutable audit logs and system event history')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = config.port;
  await app.listen(port);
  logger.log(`=======================================================`);
  logger.log(` HelpDesk API is running on: http://localhost:${port}/api/v1`);
  logger.log(` Swagger documentation at:   http://localhost:${port}/api/docs`);
  logger.log(` Environment:                ${config.nodeEnv}`);
  logger.log(`=======================================================`);
}

bootstrap();
