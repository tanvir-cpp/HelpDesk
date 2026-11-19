import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TicketCommentsService } from './ticket-comments.service';
import { TicketComment } from './entities/ticket-comment.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { Role } from '../../common/enums/role.enum';

describe('TicketCommentsService', () => {
  let service: TicketCommentsService;
  let mockCommentRepo: any;
  let mockTicketRepo: any;

  beforeEach(async () => {
    mockCommentRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((c) =>
        Promise.resolve({
          id: 'comment-uuid-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...c,
        }),
      ),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockTicketRepo = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketCommentsService,
        { provide: getRepositoryToken(TicketComment), useValue: mockCommentRepo },
        { provide: getRepositoryToken(Ticket), useValue: mockTicketRepo },
      ],
    }).compile();

    service = module.get<TicketCommentsService>(TicketCommentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create comment', () => {
    it('should throw NotFoundException if referenced ticket does not exist', async () => {
      const qbMock = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockTicketRepo.createQueryBuilder.mockReturnValue(qbMock);

      await expect(
        service.create(
          'non-existent-ticket',
          { content: 'Here is info' },
          { id: 'client-1', role: Role.CLIENT },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if Client attempts to comment on someone else ticket', async () => {
      const qbMock = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'ticket-1',
          createdById: 'different-client-id',
        }),
      };
      mockTicketRepo.createQueryBuilder.mockReturnValue(qbMock);

      await expect(
        service.create(
          'ticket-1',
          { content: 'Here is info' },
          { id: 'client-1', role: Role.CLIENT },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create comment successfully when authorized', async () => {
      const qbMock = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 'ticket-1',
          createdById: 'client-1',
        }),
      };
      mockTicketRepo.createQueryBuilder.mockReturnValue(qbMock);

      mockCommentRepo.findOne.mockResolvedValue({
        id: 'comment-uuid-1',
        content: 'I provided details',
        ticketId: 'ticket-1',
        authorId: 'client-1',
        ticket: { id: 'ticket-1', createdById: 'client-1' },
      });

      const result = await service.create(
        'ticket-1',
        { content: 'I provided details' },
        { id: 'client-1', role: Role.CLIENT },
      );

      expect(result).toHaveProperty('id', 'comment-uuid-1');
      expect(result.content).toBe('I provided details');
    });
  });

  describe('update and delete ownership rules', () => {
    it('should forbid editing by non-author non-admin user', async () => {
      mockCommentRepo.findOne.mockResolvedValue({
        id: 'comment-1',
        authorId: 'author-user-id',
        ticket: { createdById: 'author-user-id' },
      });

      await expect(
        service.update(
          'comment-1',
          { content: 'Hacked comment' },
          { id: 'different-user', role: Role.CLIENT },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow author to update their comment', async () => {
      mockCommentRepo.findOne.mockResolvedValue({
        id: 'comment-1',
        authorId: 'author-user-id',
        content: 'Original',
        ticket: { createdById: 'author-user-id' },
      });

      const updated = await service.update(
        'comment-1',
        { content: 'Edited by author' },
        { id: 'author-user-id', role: Role.CLIENT },
      );

      expect(mockCommentRepo.save).toHaveBeenCalled();
    });

    it('should allow Admin to delete any comment', async () => {
      mockCommentRepo.findOne.mockResolvedValue({
        id: 'comment-1',
        authorId: 'author-user-id',
        ticket: { createdById: 'author-user-id' },
      });

      const res = await service.remove('comment-1', { id: 'admin-id', role: Role.ADMIN });
      expect(res.message).toBe('Comment deleted successfully');
      expect(mockCommentRepo.delete).toHaveBeenCalledWith('comment-1');
    });
  });
});
