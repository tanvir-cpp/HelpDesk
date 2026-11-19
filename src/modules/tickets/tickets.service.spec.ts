import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { Ticket } from './entities/ticket.entity';
import { TicketActivity } from '../ticket-activities/entities/ticket-activity.entity';
import { TicketStatus } from '../../common/enums/ticket-status.enum';
import { TicketPriority } from '../../common/enums/ticket-priority.enum';
import { Role } from '../../common/enums/role.enum';

describe('TicketsService', () => {
  let service: TicketsService;
  let mockTicketRepo: any;
  let mockActivityRepo: any;

  beforeEach(async () => {
    mockTicketRepo = {
      count: jest.fn().mockResolvedValue(5),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((ticket) =>
        Promise.resolve({
          id: 'ticket-uuid-1',
          referenceNumber: 'HD-2026-0006-1234',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...ticket,
        }),
      ),
      createQueryBuilder: jest.fn(),
    };

    mockActivityRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockResolvedValue({ id: 'act-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: getRepositoryToken(Ticket), useValue: mockTicketRepo },
        { provide: getRepositoryToken(TicketActivity), useValue: mockActivityRepo },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create ticket with OPEN status and generated reference number', async () => {
      const qbMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'ticket-uuid-1',
          referenceNumber: 'HD-2026-0006-1234',
          subject: 'Broken feature',
          description: 'Details',
          status: TicketStatus.OPEN,
          priority: TicketPriority.HIGH,
          createdById: 'client-uuid-1',
        }),
      };
      mockTicketRepo.createQueryBuilder.mockReturnValue(qbMock);

      const result = await service.create(
        {
          subject: 'Broken feature',
          description: 'Details',
          priority: TicketPriority.HIGH,
        },
        { id: 'client-uuid-1', role: Role.CLIENT },
      );

      expect(mockTicketRepo.create).toHaveBeenCalled();
      expect(result.status).toBe(TicketStatus.OPEN);
      expect(result.referenceNumber).toContain('HD-2026');
    });
  });

  describe('findById access control', () => {
    it('should throw ForbiddenException if Client accesses someone else ticket', async () => {
      const qbMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'ticket-uuid-1',
          createdById: 'client-uuid-owner',
        }),
      };
      mockTicketRepo.createQueryBuilder.mockReturnValue(qbMock);

      await expect(
        service.findById('ticket-uuid-1', { id: 'other-client', role: Role.CLIENT }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow Staff to view any ticket', async () => {
      const targetTicket = { id: 'ticket-uuid-1', createdById: 'client-uuid-owner' };
      const qbMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(targetTicket),
      };
      mockTicketRepo.createQueryBuilder.mockReturnValue(qbMock);

      const result = await service.findById('ticket-uuid-1', { id: 'staff-uuid', role: Role.STAFF });
      expect(result).toEqual(targetTicket);
    });
  });

  describe('status transitions and resolution', () => {
    it('should forbid Client from updating status', async () => {
      await expect(
        service.updateStatus('ticket-uuid-1', TicketStatus.IN_PROGRESS, {
          id: 'client-1',
          role: Role.CLIENT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow Staff to update status to IN_PROGRESS', async () => {
      const existingTicket = {
        id: 'ticket-uuid-1',
        status: TicketStatus.OPEN,
        createdById: 'client-1',
      };
      const qbMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existingTicket),
      };
      mockTicketRepo.createQueryBuilder.mockReturnValue(qbMock);

      const updated = await service.updateStatus('ticket-uuid-1', TicketStatus.IN_PROGRESS, {
        id: 'staff-1',
        role: Role.STAFF,
      });

      expect(updated.status).toBe(TicketStatus.IN_PROGRESS);
    });

    it('should resolve ticket with notes when called by Staff', async () => {
      const existingTicket = {
        id: 'ticket-uuid-1',
        status: TicketStatus.IN_PROGRESS,
        createdById: 'client-1',
      };
      const qbMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existingTicket),
      };
      mockTicketRepo.createQueryBuilder.mockReturnValue(qbMock);

      const resolved = await service.resolve(
        'ticket-uuid-1',
        { resolutionNote: 'Issue patched on cloud server.' },
        { id: 'staff-1', role: Role.STAFF },
      );

      expect(resolved.status).toBe(TicketStatus.RESOLVED);
      expect(resolved.resolutionNote).toBe('Issue patched on cloud server.');
      expect(resolved.resolvedById).toBe('staff-1');
    });
  });
});
