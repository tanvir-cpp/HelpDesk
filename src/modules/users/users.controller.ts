import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new user / Staff account (Admin only)' })
  @ApiResponse({ status: 201, description: 'User account created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden. Only Admin can create users directly' })
  @ApiResponse({ status: 409, description: 'Conflict. Email already in use' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser('role') creatorRole: Role,
  ) {
    const user = await this.usersService.create(createUserDto, creatorRole);
    return {
      message: `User account created successfully with role ${user.role}`,
      data: user,
    };
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all users in the system (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all registered users' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires ADMIN role' })
  async findAll() {
    const users = await this.usersService.findAll();
    return {
      message: 'Users retrieved successfully',
      data: users,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details by ID (Self, Staff, or Admin)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden. Clients can only view their own profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: { id: string; role: Role },
  ) {
    // Clients can only view their own profile
    if (currentUser.role === Role.CLIENT && currentUser.id !== id) {
      throw new ForbiddenException('Clients can only view their own profile');
    }
    const user = await this.usersService.findById(id);
    return {
      message: 'User retrieved successfully',
      data: user,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user account information (Admin or Self)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden. Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: { id: string; role: Role },
  ) {
    const user = await this.usersService.update(id, updateUserDto, currentUser);
    return {
      message: 'User account updated successfully',
      data: user,
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete or safely deactivate a user account (Admin only)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User deleted or safely deactivated' })
  @ApiResponse({ status: 400, description: 'Cannot delete own admin account' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires ADMIN role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') currentAdminId: string,
  ) {
    const result = await this.usersService.remove(id, currentAdminId);
    return {
      message: result.message,
      data: { id, deactivatedOnly: result.deactivatedOnly ?? false },
    };
  }
}
