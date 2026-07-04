import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetWorkQueueUseCase } from '../application/get-work-queue.usecase';
import { WorkQueueQueryDto } from './dto/work-queue-query.dto';

@ApiTags('work-queue')
@Controller('work-queue')
export class WorkQueueController {
  constructor(private readonly getWorkQueue: GetWorkQueueUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Cola de trabajo: clientes en mora ordenados por prioridad (riesgo × monto)',
  })
  @ApiOkResponse({ description: 'Lista priorizada con segmento, score y acción sugerida' })
  execute(@Query() query: WorkQueueQueryDto) {
    return this.getWorkQueue.execute({
      segment: query.segment,
      bucket: query.bucket,
      search: query.search,
    });
  }
}
