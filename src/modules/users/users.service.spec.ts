import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Role } from '../../common/enums/role.enum';

describe('UsersService', () => {
  let service: UsersService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((user) => Promise.resolve({ id: 'uuid-1', ...user, createdAt: new Date(), updatedAt: new Date() })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(10),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a client user successfully', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const result = await service.create({
        name: 'John Client',
        email: 'john@client.com',
        password: 'password123',
      });
      expect(result).toHaveProperty('id', 'uuid-1');
      expect(result.email).toBe('john@client.com');
      expect(result).not.toHaveProperty('password');
    });

    it('should throw ConflictException if email exists', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 'uuid-existing' });
      await expect(
        service.create({
          name: 'John',
          email: 'john@client.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should forbid non-admin from creating staff role', async () => {
      await expect(
        service.create(
          {
            name: 'Staff Candidate',
            email: 'staff@client.com',
            password: 'password123',
            role: Role.STAFF,
          },
          Role.CLIENT,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      const mockUser = { id: 'uuid-1', name: 'John', email: 'john@test.com', role: Role.CLIENT };
      mockRepository.findOne.mockResolvedValue(mockUser);
      const user = await service.findById('uuid-1');
      expect(user).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
