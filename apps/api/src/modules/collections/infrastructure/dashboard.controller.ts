import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetDashboardUseCase } from '../application/get-dashboard.usecase';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly getDashboard: GetDashboardUseCase) {}

  @Get('kpis')
  @ApiOperation({ summary: 'KPIs de salud de cartera (% mora, monto vencido, DSO, promesas activas)' })
  @ApiOkResponse({ description: 'KPIs calculados al momento de la consulta' })
  async kpis() {
    return (await this.getDashboard.execute()).kpis;
  }

  @Get('aging')
  @ApiOperation({ summary: 'Aging report: deuda vencida por antigüedad (0-30 / 31-60 / 61-90 / +90)' })
  @ApiOkResponse({ description: 'Monto, facturas y clientes por bucket' })
  async aging() {
    return (await this.getDashboard.execute()).aging;
  }

  @Get('segments')
  @ApiOperation({ summary: 'Composición de la cartera por segmento de riesgo' })
  @ApiOkResponse({ description: 'Clientes y monto vencido por segmento' })
  async segments() {
    return (await this.getDashboard.execute()).segments;
  }
}
