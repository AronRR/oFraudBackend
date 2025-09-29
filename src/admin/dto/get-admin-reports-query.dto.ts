import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { ReportStatus } from 'src/reports/report.repository';

const REPORT_STATUS_VALUES: ReportStatus[] = ['pending', 'approved', 'rejected', 'removed'];

export class GetAdminReportsQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar los reportes por estado actual',
    enum: REPORT_STATUS_VALUES,
    example: 'pending',
  })
  @IsOptional()
  @IsIn(REPORT_STATUS_VALUES)
  status?: ReportStatus;

  @ApiPropertyOptional({ description: 'Número de página para la paginación', minimum: 1, example: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ description: 'Cantidad de elementos por página', minimum: 1, maximum: 100, example: 20, default: 20 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
