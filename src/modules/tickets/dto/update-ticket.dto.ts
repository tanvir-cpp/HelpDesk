import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '../../../common/enums/ticket-priority.enum';

export class UpdateTicketDto {
  @ApiPropertyOptional({
    example: 'Cannot access payment gateway on mobile safari',
    description: 'Updated ticket subject',
  })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({
    example: 'Updated steps to reproduce: clearing cookies does not resolve.',
    description: 'Updated ticket description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: TicketPriority,
    description: 'Updated priority (Staff or Admin)',
  })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;
}
