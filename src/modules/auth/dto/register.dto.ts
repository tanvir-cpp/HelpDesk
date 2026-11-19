import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Alice Client', description: 'Full name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'alice@client.com', description: 'Client email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'ClientSecret123!', description: 'Password (min 6 characters)', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
