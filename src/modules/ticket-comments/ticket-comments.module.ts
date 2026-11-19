import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketCommentsService } from './ticket-comments.service';
import { TicketCommentsController } from './ticket-comments.controller';
import { TicketComment } from './entities/ticket-comment.entity';
import { Ticket } from '../tickets/entities/ticket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TicketComment, Ticket])],
  controllers: [TicketCommentsController],
  providers: [TicketCommentsService],
  exports: [TicketCommentsService, TypeOrmModule],
})
export class TicketCommentsModule {}
