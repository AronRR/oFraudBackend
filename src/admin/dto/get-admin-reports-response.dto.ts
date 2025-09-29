import { ApiProperty } from '@nestjs/swagger';
import type { ReportStatus } from 'src/reports/report.repository';

const REPORT_STATUS_VALUES: ReportStatus[] = ['pending', 'approved', 'rejected', 'removed'];

export class AdminReportAuthorDto {
  @ApiProperty({ description: 'Identificador del autor del reporte', example: 42 })
  id: number;

  @ApiProperty({ description: 'Correo electrónico del autor', example: 'autor@ofraud.test' })
  email: string | null;

  @ApiProperty({ description: 'Nombre completo del autor', example: 'María Pérez' })
  name: string | null;
}

export class AdminReportReviewerDto {
  @ApiProperty({ description: 'Identificador del administrador que revisó el reporte', example: 7 })
  id: number;

  @ApiProperty({ description: 'Nombre completo del administrador', example: 'Equipo Moderación' })
  name: string | null;
}

export class AdminReportListItemDto {
  @ApiProperty({ description: 'Identificador del reporte', example: 101 })
  reportId: number;

  @ApiProperty({ description: 'Título de la revisión aprobada o pendiente', nullable: true })
  title: string | null;

  @ApiProperty({ description: 'Estado actual del reporte', enum: REPORT_STATUS_VALUES })
  status: ReportStatus;

  @ApiProperty({ description: 'Identificador de la categoría asociada', example: 3 })
  categoryId: number;

  @ApiProperty({ description: 'Nombre de la categoría asociada', example: 'Noticias falsas', nullable: true })
  categoryName: string | null;

  @ApiProperty({ type: AdminReportAuthorDto })
  author: AdminReportAuthorDto;

  @ApiProperty({ type: AdminReportReviewerDto, nullable: true })
  reviewer: AdminReportReviewerDto | null;

  @ApiProperty({ description: 'Fecha de creación del reporte en formato ISO 8601' })
  createdAt: string;

  @ApiProperty({ description: 'Fecha de última actualización del reporte en formato ISO 8601' })
  updatedAt: string;

  @ApiProperty({ description: 'Fecha en la que se revisó el reporte', nullable: true })
  reviewedAt: string | null;

  @ApiProperty({ description: 'Fecha de publicación del reporte', nullable: true })
  publishedAt: string | null;

  @ApiProperty({ description: 'Notas de revisión registradas por el administrador', nullable: true })
  reviewNotes: string | null;

  @ApiProperty({ description: 'Motivo de rechazo o eliminación, cuando aplica', nullable: true })
  rejectionReasonText: string | null;
}

export class AdminReportsMetaDto {
  @ApiProperty({ description: 'Número de página devuelto', example: 1 })
  page: number;

  @ApiProperty({ description: 'Cantidad de elementos por página', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Cantidad total de reportes que cumplen el filtro', example: 57 })
  total: number;
}

export class GetAdminReportsResponseDto {
  @ApiProperty({ type: [AdminReportListItemDto] })
  items: AdminReportListItemDto[];

  @ApiProperty({ type: AdminReportsMetaDto })
  meta: AdminReportsMetaDto;
}
