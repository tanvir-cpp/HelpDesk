import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configuration } from './config/configuration';
import { AppController } from './app.controller';
import { User } from './modules/users/entities/user.entity';
import { Ticket } from './modules/tickets/entities/ticket.entity';
import { TicketComment } from './modules/ticket-comments/entities/ticket-comment.entity';
import { TicketActivity } from './modules/ticket-activities/entities/ticket-activity.entity';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { TicketsModule } from './modules/tickets/tickets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env.development',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const db = configService.get('database');
        return {
          type: 'postgres',
          host: db.host,
          port: db.port,
          username: db.username,
          password: db.password,
          database: db.database,
          entities: [User, Ticket, TicketComment, TicketActivity],
          synchronize: false,
          logging: configService.get('nodeEnv') === 'development',
        };
      },
    }),
    UsersModule,
    AuthModule,
    TicketsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}