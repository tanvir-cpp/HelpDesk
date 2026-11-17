import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@helpdesk.com', description: 'Registered email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Admin@12345', description: 'User account password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
