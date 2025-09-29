/* eslint-disable prettier/prettier */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import type { ReportStatus } from '../report.repository';

const REPORT_STATUS_VALUES: ReportStatus[] = ['pending', 'approved', 'rejected', 'removed'];

export class GetMyReportsQueryDto {
  @ApiPropertyOptional({ description: 'Número de página a recuperar', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Cantidad de reportes por página', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filtrar reportes por estado actual', enum: REPORT_STATUS_VALUES })
  @IsOptional()
  @IsEnum(REPORT_STATUS_VALUES)
  status?: ReportStatus;
}
