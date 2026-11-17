import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('System')
@Controller()
export class AppController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'System health check' })
  @ApiResponse({ status: 200, description: 'Application is healthy and running' })
  getHealth() {
    return {
      status: 'healthy',
      service: 'HelpDesk Backend API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}