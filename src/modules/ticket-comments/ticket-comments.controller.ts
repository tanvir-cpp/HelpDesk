import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
import { TicketCommentsService } from './ticket-comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Ticket Comments')
@ApiBearerAuth('JWT-auth')
@Controller()
export class TicketCommentsController {
  constructor(private readonly commentsService: TicketCommentsService) {}

  @Post('tickets/:ticketId/comments')
  @ApiOperation({ summary: 'Add a comment / reply to a ticket' })
  @ApiParam({ name: 'ticketId', description: 'Ticket UUID or reference number' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden if Client attempts to comment on someone else ticket' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async create(
    @Param('ticketId') ticketId: string,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const comment = await this.commentsService.create(ticketId, createCommentDto, user);
    return {
      message: 'Comment added successfully',
      data: comment,
    };
  }

  @Get('tickets/:ticketId/comments')
  @ApiOperation({ summary: 'Get all comments for a ticket in chronological order' })
  @ApiParam({ name: 'ticketId', description: 'Ticket UUID or reference number' })
  @ApiResponse({ status: 200, description: 'List of comments in chronological order' })
  @ApiResponse({ status: 403, description: 'Forbidden if Client attempts to read unowned ticket comments' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async findByTicketId(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const comments = await this.commentsService.findByTicketId(ticketId, user);
    return {
      message: 'Comments retrieved successfully',
      data: comments,
    };
  }

  @Get('ticket-comments/:id')
  @ApiOperation({ summary: 'Get an individual comment by ID' })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  @ApiResponse({ status: 200, description: 'Comment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const comment = await this.commentsService.findById(id, user);
    return {
      message: 'Comment retrieved successfully',
      data: comment,
    };
  }

  @Patch('ticket-comments/:id')
  @ApiOperation({ summary: 'Update a comment (Author or Admin only)' })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden. Not the author or admin' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const comment = await this.commentsService.update(id, updateCommentDto, user);
    return {
      message: 'Comment updated successfully',
      data: comment,
    };
  }

  @Delete('ticket-comments/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a comment (Author or Admin only)' })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden. Not the author or admin' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const result = await this.commentsService.remove(id, user);
    return {
      message: result.message,
      data: { id: result.id },
    };
  }
}
