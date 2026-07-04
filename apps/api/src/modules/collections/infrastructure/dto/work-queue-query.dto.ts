import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { AgingBucket } from '../../domain/aging';
import { AGING_BUCKETS } from '../../domain/aging';
import type { Segment } from '../../domain/types';

const SEGMENTS: Segment[] = ['al_dia', 'mora_administrativa', 'en_riesgo', 'critico'];

export class WorkQueueQueryDto {
  @ApiPropertyOptional({ enum: SEGMENTS })
  @IsOptional()
  @IsIn(SEGMENTS)
  segment?: Segment;

  @ApiPropertyOptional({ enum: AGING_BUCKETS })
  @IsOptional()
  @IsIn(AGING_BUCKETS)
  bucket?: AgingBucket;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre de cliente' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
