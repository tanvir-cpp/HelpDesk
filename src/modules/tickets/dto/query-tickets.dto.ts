import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus } from '../../../common/enums/ticket-status.enum';
import { TicketPriority } from '../../../common/enums/ticket-priority.enum';

export class QueryTicketsDto {
  @ApiPropertyOptional({ description: 'Text search in subject or description' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: TicketStatus, description: 'Filter by ticket status' })
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority, description: 'Filter by ticket priority' })
  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Filter tickets created on or after this ISO date string' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter tickets created on or before this ISO date string' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ default: 1, description: 'Page number for pagination' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, description: 'Items per page' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    default: 'createdAt',
    description: 'Field name to sort by (createdAt, priority, status, subject)',
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC', description: 'Sort direction' })
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
