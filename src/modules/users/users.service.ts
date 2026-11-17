import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  private get saltRounds(): number {
    return this.configService.get<number>('bcrypt.saltRounds') || 12;
  }

  async create(createUserDto: CreateUserDto, creatorRole?: Role): Promise<Omit<User, 'password'>> {
    // If not Admin creating, role must default to CLIENT or be blocked from assigning ADMIN/STAFF
    if (creatorRole && creatorRole !== Role.ADMIN) {
      if (createUserDto.role && createUserDto.role !== Role.CLIENT) {
        throw new ForbiddenException('Only Administrators can assign STAFF or ADMIN roles');
      }
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException(`User with email "${createUserDto.email}" already exists`);
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, this.saltRounds);

    const user = this.userRepository.create({
      name: createUserDto.name,
      email: createUserDto.email.toLowerCase(),
      password: hashedPassword,
      role: createUserDto.role || Role.CLIENT,
      isActive: createUserDto.isActive !== undefined ? createUserDto.isActive : true,
    });

    const savedUser = await this.userRepository.save(user);
    const { password, ...result } = savedUser;
    return result as Omit<User, 'password'>;
  }

  async findAll(): Promise<Omit<User, 'password'>[]> {
    return this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" was not found`);
    }

    return user;
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(user.email) = :email', { email: email.toLowerCase() })
      .getOne();
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUser: { id: string; role: Role },
  ): Promise<Omit<User, 'password'>> {
    const user = await this.findById(id);

    // Only Admin can update other users' details or modify role / isActive
    const isAdmin = currentUser.role === Role.ADMIN;
    const isSelf = currentUser.id === id;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException('You do not have permission to update this user account');
    }

    // Role and active status changes require ADMIN
    if (updateUserDto.role && updateUserDto.role !== user.role && !isAdmin) {
      throw new ForbiddenException('Only Administrators can change user roles');
    }

    if (updateUserDto.isActive !== undefined && updateUserDto.isActive !== user.isActive && !isAdmin) {
      throw new ForbiddenException('Only Administrators can activate or deactivate accounts');
    }

    // If updating email, check for duplicate
    if (updateUserDto.email && updateUserDto.email.toLowerCase() !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email.toLowerCase() },
      });
      if (existingUser) {
        throw new ConflictException(`Email "${updateUserDto.email}" is already taken`);
      }
      user.email = updateUserDto.email.toLowerCase();
    }

    if (updateUserDto.name) {
      user.name = updateUserDto.name;
    }

    if (updateUserDto.password) {
      user.password = await bcrypt.hash(updateUserDto.password, this.saltRounds);
    }

    if (isAdmin && updateUserDto.role) {
      user.role = updateUserDto.role;
    }

    if (isAdmin && updateUserDto.isActive !== undefined) {
      user.isActive = updateUserDto.isActive;
    }

    const updatedUser = await this.userRepository.save(user);
    const { password, ...result } = updatedUser;
    return result as Omit<User, 'password'>;
  }

  async updateRole(id: string, newRole: Role): Promise<Omit<User, 'password'>> {
    const user = await this.findById(id);
    user.role = newRole;
    const updatedUser = await this.userRepository.save(user);
    const { password, ...result } = updatedUser;
    return result as Omit<User, 'password'>;
  }

  async setAccountStatus(id: string, isActive: boolean): Promise<Omit<User, 'password'>> {
    const user = await this.findById(id);
    user.isActive = isActive;
    const updatedUser = await this.userRepository.save(user);
    const { password, ...result } = updatedUser;
    return result as Omit<User, 'password'>;
  }

  async remove(id: string, currentAdminId: string): Promise<{ message: string; deactivatedOnly?: boolean }> {
    if (id === currentAdminId) {
      throw new BadRequestException('Administrators cannot delete or deactivate their own active account');
    }

    const user = await this.findById(id);

    try {
      await this.userRepository.delete(id);
      return { message: `User "${user.name}" (${user.email}) permanently deleted successfully` };
    } catch {
      // If user has foreign key constraints (e.g. has created tickets or comments), safely deactivate instead!
      user.isActive = false;
      await this.userRepository.save(user);
      return {
        message: `User "${user.name}" (${user.email}) has related records and was safely deactivated instead of deleted`,
        deactivatedOnly: true,
      };
    }
  }
}
