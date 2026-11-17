import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'john@example.com', description: 'Unique email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Password123!', description: 'User password (minimum 6 characters)', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ enum: Role, default: Role.STAFF, description: 'Role assigned to the user' })
  @IsEnum(Role)
  @IsOptional()
  role?: Role = Role.STAFF;

  @ApiPropertyOptional({ example: true, default: true, description: 'Account active status' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
