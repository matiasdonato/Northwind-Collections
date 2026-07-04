import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import type { HealthStatus } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check del servicio' })
  @ApiOkResponse({ description: 'El servicio está operativo' })
  getHealth(): HealthStatus {
    return this.appService.getHealth();
  }
}
