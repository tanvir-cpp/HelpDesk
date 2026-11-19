import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Tickets')
@ApiBearerAuth('JWT-auth')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new complaint ticket (Clients & Users)' })
  @ApiResponse({ status: 201, description: 'Ticket created successfully with unique reference number' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async create(
    @Body() createTicketDto: CreateTicketDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const ticket = await this.ticketsService.create(createTicketDto, user);
    return {
      message: 'Ticket created successfully',
      data: ticket,
    };
  }

  @Get()
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Get all tickets with filters and pagination (Staff / Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of complaint tickets' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires STAFF or ADMIN role' })
  async findAll(@Query() queryDto: QueryTicketsDto) {
    const result = await this.ticketsService.findAll(queryDto);
    return {
      message: 'Tickets retrieved successfully',
      data: result.items,
      meta: result.meta,
    };
  }

  @Get('my-tickets')
  @ApiOperation({ summary: 'Get tickets submitted by the authenticated Client' })
  @ApiResponse({ status: 200, description: 'List of tickets submitted by caller' })
  async findMyTickets(
    @Query() queryDto: QueryTicketsDto,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.ticketsService.findMyTickets(queryDto, userId);
    return {
      message: 'Your tickets retrieved successfully',
      data: result.items,
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket details by UUID or reference number' })
  @ApiParam({ name: 'id', description: 'Ticket UUID or Reference Number (e.g. HD-2026-0001)' })
  @ApiResponse({ status: 200, description: 'Ticket details retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden if Client attempts to access another client ticket' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const ticket = await this.ticketsService.findById(id, user);
    return {
      message: 'Ticket retrieved successfully',
      data: ticket,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update ticket subject, description, or priority' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request (e.g. ticket not OPEN for client edit)' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const ticket = await this.ticketsService.update(id, updateTicketDto, user);
    return {
      message: 'Ticket updated successfully',
      data: ticket,
    };
  }

  @Patch(':id/status')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Update ticket status (Staff / Admin only)' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket status updated' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires STAFF or ADMIN role' })
  async updateStatus(
    @Param('id') id: string,
    @Body() statusDto: UpdateTicketStatusDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const ticket = await this.ticketsService.updateStatus(id, statusDto.status, user);
    return {
      message: `Ticket status updated to ${ticket.status}`,
      data: ticket,
    };
  }

  @Patch(':id/resolve')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Resolve a complaint ticket with resolution notes (Staff / Admin only)' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket resolved' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async resolve(
    @Param('id') id: string,
    @Body() resolveDto: ResolveTicketDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const ticket = await this.ticketsService.resolve(id, resolveDto, user);
    return {
      message: 'Ticket resolved successfully',
      data: ticket,
    };
  }

  @Patch(':id/close')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Formally close a ticket (Staff / Admin only)' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket closed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async close(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const ticket = await this.ticketsService.close(id, user);
    return {
      message: 'Ticket closed successfully',
      data: ticket,
    };
  }

  @Patch(':id/reopen')
  @ApiOperation({ summary: 'Reopen a resolved or closed ticket' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket reopened to OPEN status' })
  @ApiResponse({ status: 400, description: 'Ticket is not resolved or closed' })
  async reopen(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const ticket = await this.ticketsService.reopen(id, user);
    return {
      message: 'Ticket reopened successfully',
      data: ticket,
    };
  }

  @Delete(':id')
  @Roles(Role.STAFF, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a complaint ticket (Staff / Admin only)' })
  @ApiParam({ name: 'id', description: 'Ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket archived successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async archive(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const result = await this.ticketsService.archive(id, user);
    return {
      message: result.message,
      data: { id: result.id, isArchived: true },
    };
  }
}
