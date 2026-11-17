import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { TicketStatus } from '../../common/enums/ticket-status.enum';
import { TicketPriority } from '../../common/enums/ticket-priority.enum';
import { Role } from '../../common/enums/role.enum';
import { TicketActivity } from '../ticket-activities/entities/ticket-activity.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketActivity)
    private readonly activityRepository: Repository<TicketActivity>,
  ) {}

  private async generateReferenceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.ticketRepository.count();
    const sequence = String(count + 1).padStart(4, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `HD-${year}-${sequence}-${randomSuffix}`;
  }

  private async recordActivity(
    ticketId: string,
    actorId: string,
    action: string,
    oldValue?: string | null,
    newValue?: string | null,
  ): Promise<void> {
    try {
      const activity = this.activityRepository.create({
        ticketId,
        actorId,
        action,
        oldValue: oldValue ?? null,
        newValue: newValue ?? null,
      });
      await this.activityRepository.save(activity);
    } catch {
      // Activity logging should not fail primary operations
    }
  }

  async create(createTicketDto: CreateTicketDto, user: { id: string; role: Role }): Promise<Ticket> {
    const referenceNumber = await this.generateReferenceNumber();

    const ticket = this.ticketRepository.create({
      referenceNumber,
      subject: createTicketDto.subject,
      description: createTicketDto.description,
      priority: createTicketDto.priority || TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      createdById: user.id,
      isArchived: false,
    });

    const savedTicket = await this.ticketRepository.save(ticket);

    // Record Activity
    await this.recordActivity(
      savedTicket.id,
      user.id,
      'TICKET_CREATED',
      null,
      `Ticket reference ${savedTicket.referenceNumber} created with status OPEN`,
    );

    return this.findById(savedTicket.id, user);
  }

  private buildQuery(queryDto: QueryTicketsDto): SelectQueryBuilder<Ticket> {
    const qb = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy')
      .leftJoinAndSelect('ticket.resolvedBy', 'resolvedBy')
      .where('ticket.isArchived = :isArchived', { isArchived: false });

    if (queryDto.search) {
      qb.andWhere(
        '(LOWER(ticket.subject) LIKE :search OR LOWER(ticket.description) LIKE :search OR LOWER(ticket.referenceNumber) LIKE :search)',
        { search: `%${queryDto.search.toLowerCase()}%` },
      );
    }

    if (queryDto.status) {
      qb.andWhere('ticket.status = :status', { status: queryDto.status });
    }

    if (queryDto.priority) {
      qb.andWhere('ticket.priority = :priority', { priority: queryDto.priority });
    }

    if (queryDto.startDate) {
      qb.andWhere('ticket.createdAt >= :startDate', { startDate: new Date(queryDto.startDate) });
    }

    if (queryDto.endDate) {
      qb.andWhere('ticket.createdAt <= :endDate', { endDate: new Date(queryDto.endDate) });
    }

    const sortField = ['createdAt', 'subject', 'priority', 'status'].includes(queryDto.sortBy || '')
      ? `ticket.${queryDto.sortBy}`
      : 'ticket.createdAt';
    const sortDir = (queryDto.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';
    qb.orderBy(sortField, sortDir);

    return qb;
  }

  async findAll(queryDto: QueryTicketsDto) {
    const page = Math.max(1, queryDto.page || 1);
    const limit = Math.max(1, Math.min(100, queryDto.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.buildQuery(queryDto);
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findMyTickets(queryDto: QueryTicketsDto, userId: string) {
    const page = Math.max(1, queryDto.page || 1);
    const limit = Math.max(1, Math.min(100, queryDto.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.buildQuery(queryDto);
    qb.andWhere('ticket.createdById = :userId', { userId });
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, user: { id: string; role: Role }): Promise<Ticket> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const qb = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy')
      .leftJoinAndSelect('ticket.resolvedBy', 'resolvedBy');

    if (isUuid) {
      qb.where('ticket.id = :id', { id });
    } else {
      qb.where('ticket.referenceNumber = :id', { id });
    }

    const ticket = await qb.getOne();

    if (!ticket) {
      throw new NotFoundException(`Ticket "${id}" was not found`);
    }

    // Role access control: Clients can only view their own tickets
    if (user.role === Role.CLIENT && ticket.createdById !== user.id) {
      throw new ForbiddenException('You are not authorized to access this ticket');
    }

    return ticket;
  }

  async update(
    id: string,
    updateTicketDto: UpdateTicketDto,
    user: { id: string; role: Role },
  ): Promise<Ticket> {
    const ticket = await this.findById(id, user);

    const isClient = user.role === Role.CLIENT;
    const isOwner = ticket.createdById === user.id;

    if (isClient && !isOwner) {
      throw new ForbiddenException('You cannot update tickets belonging to other clients');
    }

    // Clients cannot change priority
    if (isClient && updateTicketDto.priority && updateTicketDto.priority !== ticket.priority) {
      throw new ForbiddenException('Clients cannot modify ticket priority');
    }

    // Clients can only update if ticket is OPEN
    if (isClient && ticket.status !== TicketStatus.OPEN) {
      throw new BadRequestException('Cannot edit ticket details once it is in progress, resolved, or closed');
    }

    const oldPriority = ticket.priority;

    if (updateTicketDto.subject) ticket.subject = updateTicketDto.subject;
    if (updateTicketDto.description) ticket.description = updateTicketDto.description;
    if (updateTicketDto.priority) ticket.priority = updateTicketDto.priority;

    const updated = await this.ticketRepository.save(ticket);

    if (updateTicketDto.priority && updateTicketDto.priority !== oldPriority) {
      await this.recordActivity(
        ticket.id,
        user.id,
        'PRIORITY_CHANGED',
        oldPriority,
        updateTicketDto.priority,
      );
    }

    return updated;
  }

  async updateStatus(
    id: string,
    newStatus: TicketStatus,
    user: { id: string; role: Role },
  ): Promise<Ticket> {
    if (user.role === Role.CLIENT) {
      throw new ForbiddenException('Clients cannot modify administrative ticket statuses');
    }

    const ticket = await this.findById(id, user);
    const oldStatus = ticket.status;

    if (oldStatus === newStatus) {
      return ticket;
    }

    ticket.status = newStatus;

    if (newStatus === TicketStatus.CLOSED && !ticket.closedAt) {
      ticket.closedAt = new Date();
    }

    const updated = await this.ticketRepository.save(ticket);

    await this.recordActivity(
      ticket.id,
      user.id,
      'STATUS_CHANGED',
      oldStatus,
      newStatus,
    );

    return updated;
  }

  async resolve(
    id: string,
    resolveDto: ResolveTicketDto,
    user: { id: string; role: Role },
  ): Promise<Ticket> {
    if (user.role === Role.CLIENT) {
      throw new ForbiddenException('Clients cannot resolve tickets');
    }

    const ticket = await this.findById(id, user);
    const oldStatus = ticket.status;

    ticket.status = TicketStatus.RESOLVED;
    ticket.resolvedById = user.id;
    ticket.resolutionNote = resolveDto.resolutionNote;
    ticket.resolvedAt = new Date();

    const updated = await this.ticketRepository.save(ticket);

    await this.recordActivity(
      ticket.id,
      user.id,
      'TICKET_RESOLVED',
      oldStatus,
      `Status: RESOLVED. Note: ${resolveDto.resolutionNote}`,
    );

    return updated;
  }

  async close(id: string, user: { id: string; role: Role }): Promise<Ticket> {
    if (user.role === Role.CLIENT) {
      throw new ForbiddenException('Clients cannot close tickets');
    }

    const ticket = await this.findById(id, user);
    const oldStatus = ticket.status;

    ticket.status = TicketStatus.CLOSED;
    ticket.closedAt = new Date();

    const updated = await this.ticketRepository.save(ticket);

    await this.recordActivity(
      ticket.id,
      user.id,
      'TICKET_CLOSED',
      oldStatus,
      'Status: CLOSED',
    );

    return updated;
  }

  async reopen(id: string, user: { id: string; role: Role }): Promise<Ticket> {
    const ticket = await this.findById(id, user);

    if (ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
      throw new BadRequestException('Only resolved or closed tickets can be reopened');
    }

    const oldStatus = ticket.status;
    ticket.status = TicketStatus.OPEN;
    ticket.closedAt = null;

    const updated = await this.ticketRepository.save(ticket);

    await this.recordActivity(
      ticket.id,
      user.id,
      'TICKET_REOPENED',
      oldStatus,
      'Status: OPEN',
    );

    return updated;
  }

  async archive(id: string, user: { id: string; role: Role }): Promise<{ message: string; id: string }> {
    if (user.role === Role.CLIENT) {
      throw new ForbiddenException('Clients cannot delete or archive tickets');
    }

    const ticket = await this.findById(id, user);
    ticket.isArchived = true;
    await this.ticketRepository.save(ticket);

    await this.recordActivity(
      ticket.id,
      user.id,
      'TICKET_ARCHIVED',
      'Active',
      'Archived',
    );

    return {
      message: `Ticket "${ticket.referenceNumber}" was archived successfully`,
      id: ticket.id,
    };
  }
}
