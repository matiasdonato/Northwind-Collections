import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetCustomerDetailUseCase } from '../application/get-customer-detail.usecase';
import { RegisterActionUseCase } from '../application/register-action.usecase';
import { CreateActionDto } from './dto/create-action.dto';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly getCustomerDetail: GetCustomerDetailUseCase,
    private readonly registerAction: RegisterActionUseCase,
  ) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Detalle de un cliente: facturas, score explicado e historial de gestiones',
  })
  @ApiOkResponse({ description: 'Detalle completo del cliente' })
  @ApiNotFoundResponse({ description: 'El cliente no existe' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.getCustomerDetail.execute(id);
  }

  @Post(':id/actions')
  @ApiOperation({ summary: 'Registrar una gestión: llamada, email, nota o promesa de pago' })
  @ApiCreatedResponse({ description: 'Gestión registrada' })
  @ApiBadRequestResponse({ description: 'Datos inválidos o regla de negocio violada' })
  @ApiNotFoundResponse({ description: 'El cliente no existe' })
  createAction(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateActionDto) {
    return this.registerAction.execute({
      customerId: id,
      invoiceId: dto.invoiceId,
      type: dto.type,
      notes: dto.notes,
      promisedDate: dto.promisedDate ? new Date(`${dto.promisedDate}T00:00:00Z`) : undefined,
    });
  }
}
