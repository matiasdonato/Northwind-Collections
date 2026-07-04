import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ example: 1500.5, description: 'Monto del pago en USD (hasta 2 decimales)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: '2026-07-04', description: 'Fecha del pago (por defecto, hoy)' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
