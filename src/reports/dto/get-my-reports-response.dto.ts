/* eslint-disable prettier/prettier */

import { ApiProperty } from '@nestjs/swagger';
import { ReportStatus } from '../report.repository';

const REPORT_STATUS_VALUES: ReportStatus[] = ['pending', 'approved', 'rejected', 'removed'];

export class MyReportListItemDto {
  @ApiProperty({ description: 'Identificador del reporte' })
  reportId: number;

  @ApiProperty({ description: 'Título del reporte en su revisión actual', nullable: true })
  title: string | null;

  @ApiProperty({ description: 'Estado actual del reporte', enum: REPORT_STATUS_VALUES })
  status: ReportStatus;

  @ApiProperty({ description: 'Identificador de la categoría asociada' })
  categoryId: number;

  @ApiProperty({ description: 'Nombre de la categoría asociada', nullable: true })
  categoryName: string | null;

  @ApiProperty({ description: 'Fecha de creación del reporte', example: '2024-01-05T12:34:56.000Z' })
  createdAt: string;

  @ApiProperty({ description: 'Fecha de última edición realizada por el autor', nullable: true, example: '2024-01-06T08:15:00.000Z' })
  lastEditedAt: string | null;

  @ApiProperty({ description: 'Fecha de la última actualización del registro', example: '2024-01-06T08:15:00.000Z' })
  updatedAt: string;
}

export class MyReportsMetaDto {
  @ApiProperty({ description: 'Número de página solicitado', example: 1 })
  page: number;

  @ApiProperty({ description: 'Cantidad de elementos por página', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total de reportes encontrados para el usuario', example: 25 })
  total: number;
}

export class GetMyReportsResponseDto {
  @ApiProperty({ type: [MyReportListItemDto] })
  items: MyReportListItemDto[];

  @ApiProperty({ type: MyReportsMetaDto })
  meta: MyReportsMetaDto;
}
