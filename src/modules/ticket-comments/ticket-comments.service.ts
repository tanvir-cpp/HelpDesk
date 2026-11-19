import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketComment } from './entities/ticket-comment.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class TicketCommentsService {
  constructor(
    @InjectRepository(TicketComment)
    private readonly commentRepository: Repository<TicketComment>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  private async validateTicketAccess(
    ticketId: string,
    user: { id: string; role: Role },
  ): Promise<Ticket> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketId);
    const qb = this.ticketRepository.createQueryBuilder('ticket');

    if (isUuid) {
      qb.where('ticket.id = :ticketId', { ticketId });
    } else {
      qb.where('ticket.referenceNumber = :ticketId', { ticketId });
    }

    const ticket = await qb.getOne();

    if (!ticket) {
      throw new NotFoundException(`Ticket "${ticketId}" was not found`);
    }

    if (user.role === Role.CLIENT && ticket.createdById !== user.id) {
      throw new ForbiddenException('You are not authorized to access or comment on this ticket');
    }

    return ticket;
  }

  async create(
    ticketId: string,
    createCommentDto: CreateCommentDto,
    user: { id: string; role: Role },
  ): Promise<TicketComment> {
    const ticket = await this.validateTicketAccess(ticketId, user);

    const comment = this.commentRepository.create({
      ticketId: ticket.id,
      authorId: user.id,
      content: createCommentDto.content,
    });

    const saved = await this.commentRepository.save(comment);

    return this.findById(saved.id, user);
  }

  async findByTicketId(
    ticketId: string,
    user: { id: string; role: Role },
  ): Promise<TicketComment[]> {
    const ticket = await this.validateTicketAccess(ticketId, user);

    return this.commentRepository.find({
      where: { ticketId: ticket.id },
      relations: ['author'],
      order: { createdAt: 'ASC' },
      select: {
        id: true,
        ticketId: true,
        authorId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    });
  }

  async findById(
    id: string,
    user: { id: string; role: Role },
  ): Promise<TicketComment> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['author', 'ticket'],
      select: {
        id: true,
        ticketId: true,
        authorId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        ticket: {
          id: true,
          referenceNumber: true,
          subject: true,
          createdById: true,
        },
      },
    });

    if (!comment) {
      throw new NotFoundException(`Comment "${id}" was not found`);
    }

    // Role check: Client must own the ticket
    if (user.role === Role.CLIENT && comment.ticket?.createdById !== user.id) {
      throw new ForbiddenException('You do not have access to view this comment');
    }

    return comment;
  }

  async update(
    id: string,
    updateCommentDto: UpdateCommentDto,
    user: { id: string; role: Role },
  ): Promise<TicketComment> {
    const comment = await this.findById(id, user);

    const isAuthor = comment.authorId === user.id;
    const isAdmin = user.role === Role.ADMIN;

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('Only the comment author or an Administrator can edit this comment');
    }

    comment.content = updateCommentDto.content;
    await this.commentRepository.save(comment);

    return this.findById(id, user);
  }

  async remove(
    id: string,
    user: { id: string; role: Role },
  ): Promise<{ message: string; id: string }> {
    const comment = await this.findById(id, user);

    const isAuthor = comment.authorId === user.id;
    const isAdmin = user.role === Role.ADMIN;

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('Only the comment author or an Administrator can delete this comment');
    }

    await this.commentRepository.delete(id);

    return {
      message: 'Comment deleted successfully',
      id,
    };
  }
}
