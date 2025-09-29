import { ApiProperty } from '@nestjs/swagger';
import { REPORT_FLAG_REASONS, REPORT_FLAG_STATUSES } from 'src/reports/report-flag.repository';
import type { ReportFlagReason, ReportFlagStatus } from 'src/reports/report-flag.repository';
import type { ReportStatus } from 'src/reports/report.repository';

const REPORT_STATUS_VALUES: ReportStatus[] = ['pending', 'approved', 'rejected', 'removed'];

export class AdminReportFlagReporterDto {
  @ApiProperty({ description: 'Identificador del usuario que reportó la alerta', example: 15 })
  id!: number;

  @ApiProperty({ description: 'Correo electrónico del usuario reportante', nullable: true })
  email!: string | null;

  @ApiProperty({ description: 'Nombre completo del usuario reportante', nullable: true })
  name!: string | null;
}

export class AdminReportFlagHandlerDto {
  @ApiProperty({ description: 'Identificador del administrador que gestionó la alerta', example: 2 })
  id!: number;

  @ApiProperty({ description: 'Nombre completo del administrador', nullable: true })
  name!: string | null;
}

export class AdminReportFlagItemDto {
  @ApiProperty({ description: 'Identificador del flag', example: 87 })
  flagId!: number;

  @ApiProperty({ description: 'Identificador del reporte asociado', example: 101 })
  reportId!: number;

  @ApiProperty({ description: 'Título de la versión visible del reporte', nullable: true })
  reportTitle!: string | null;

  @ApiProperty({ description: 'Estado actual del reporte', enum: REPORT_STATUS_VALUES })
  reportStatus!: ReportStatus;

  @ApiProperty({ description: 'Código del motivo reportado', enum: REPORT_FLAG_REASONS })
  reasonCode!: ReportFlagReason;

  @ApiProperty({ description: 'Detalle adicional proporcionado por el usuario', nullable: true })
  details!: string | null;

  @ApiProperty({ description: 'Estado de revisión del flag', enum: REPORT_FLAG_STATUSES })
  status!: ReportFlagStatus;

  @ApiProperty({ description: 'Fecha de creación del flag en formato ISO 8601' })
  createdAt!: string;

  @ApiProperty({ description: 'Fecha de resolución del flag', nullable: true })
  handledAt!: string | null;

  @ApiProperty({ type: AdminReportFlagReporterDto })
  reporter!: AdminReportFlagReporterDto;

  @ApiProperty({ type: AdminReportFlagHandlerDto, nullable: true })
  handler!: AdminReportFlagHandlerDto | null;
}

export class AdminReportFlagCountsDto {
  @ApiProperty({ description: 'Cantidad de flags en estado pendiente', example: 4 })
  pending!: number;

  @ApiProperty({ description: 'Cantidad de flags validados por moderación', example: 2 })
  validated!: number;

  @ApiProperty({ description: 'Cantidad de flags descartados', example: 3 })
  dismissed!: number;
}

export class AdminReportFlagMetaDto {
  @ApiProperty({ description: 'Número de página devuelto', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Cantidad de elementos por página', example: 20 })
  limit!: number;

  @ApiProperty({ description: 'Total de flags que cumplen con los filtros', example: 12 })
  total!: number;
}

export class GetReportFlagsResponseDto {
  @ApiProperty({ type: [AdminReportFlagItemDto] })
  items!: AdminReportFlagItemDto[];

  @ApiProperty({ type: AdminReportFlagMetaDto })
  meta!: AdminReportFlagMetaDto;

  @ApiProperty({ type: AdminReportFlagCountsDto })
  counts!: AdminReportFlagCountsDto;
}

