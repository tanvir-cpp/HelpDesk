import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { Role } from '../../common/enums/role.enum';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockUsersService = {
      findByEmailWithPassword: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };

    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(null);
      await expect(
        service.login({ email: 'unknown@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is deactivated', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue({
        id: 'uuid-1',
        email: 'inactive@test.com',
        isActive: false,
      });
      await expect(
        service.login({ email: 'inactive@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return accessToken and user on valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('validpass', 10);
      mockUsersService.findByEmailWithPassword.mockResolvedValue({
        id: 'uuid-1',
        name: 'John Client',
        email: 'john@client.com',
        password: hashedPassword,
        role: Role.CLIENT,
        isActive: true,
        createdAt: new Date(),
      });

      const result = await service.login({ email: 'john@client.com', password: 'validpass' });
      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result.user.email).toBe('john@client.com');
    });
  });
});
