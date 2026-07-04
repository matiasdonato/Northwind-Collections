import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import type { ActionType } from '../../domain/types';

const ACTION_TYPES: ActionType[] = ['call', 'email', 'note', 'payment_promise'];

export class CreateActionDto {
  @ApiProperty({ enum: ACTION_TYPES, description: 'Tipo de gestión de cobranza' })
  @IsIn(ACTION_TYPES)
  type: ActionType;

  @ApiPropertyOptional({ description: 'Factura del cliente a la que refiere la gestión' })
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    example: '2026-07-15',
    description: 'Fecha comprometida (obligatoria para promesas de pago)',
  })
  @ValidateIf((dto: CreateActionDto) => dto.type === 'payment_promise' || dto.promisedDate !== undefined)
  @IsDateString()
  promisedDate?: string;
}
