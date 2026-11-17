import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '../../../common/enums/ticket-priority.enum';

export class CreateTicketDto {
  @ApiProperty({
    example: 'Cannot access payment gateway',
    description: 'Concise summary of the complaint or issue',
  })
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiProperty({
    example: 'When attempting to complete checkout via credit card, error 504 gateway timeout occurs.',
    description: 'Detailed explanation of the issue encountered',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
    description: 'Initial priority level assigned to the ticket',
  })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority = TicketPriority.MEDIUM;
}
