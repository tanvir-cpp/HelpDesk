import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus } from '../../../common/enums/ticket-status.enum';

export class UpdateTicketStatusDto {
  @ApiProperty({
    enum: TicketStatus,
    example: TicketStatus.IN_PROGRESS,
    description: 'New status for the ticket (Staff/Admin only)',
  })
  @IsEnum(TicketStatus)
  @IsNotEmpty()
  status!: TicketStatus;
}
