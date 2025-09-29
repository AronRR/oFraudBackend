import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { REPORT_FLAG_STATUSES, ReportFlagStatus } from 'src/reports/report-flag.repository';

export class GetReportFlagsQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar flags por estado', enum: REPORT_FLAG_STATUSES })
  @IsOptional()
  @IsIn(REPORT_FLAG_STATUSES)
  status?: ReportFlagStatus;

  @ApiPropertyOptional({ description: 'Filtrar por reporte específico', minimum: 1, example: 42 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  reportId?: number;

  @ApiPropertyOptional({ description: 'Número de página', minimum: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ description: 'Cantidad de registros por página', minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
