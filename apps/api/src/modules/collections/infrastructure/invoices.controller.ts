import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RegisterPaymentUseCase } from '../application/register-payment.usecase';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly registerPayment: RegisterPaymentUseCase) {}

  @Post(':id/payments')
  @ApiOperation({ summary: 'Registrar un pago (total o parcial) sobre una factura' })
  @ApiCreatedResponse({
    description: 'Pago registrado; incluye el nuevo estado de la factura y las promesas cumplidas',
  })
  @ApiBadRequestResponse({ description: 'Monto inválido, factura pagada/anulada o pago futuro' })
  @ApiNotFoundResponse({ description: 'La factura no existe' })
  create(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreatePaymentDto) {
    return this.registerPayment.execute({
      invoiceId: id,
      amount: dto.amount,
      paidAt: dto.paidAt ? new Date(`${dto.paidAt}T00:00:00Z`) : undefined,
    });
  }
}
