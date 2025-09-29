/* eslint-disable prettier/prettier */

import { ApiProperty } from '@nestjs/swagger';

export class ReportFeedItemDto {
  @ApiProperty({ description: 'Identificador del reporte' })
  reportId: number;

  @ApiProperty({ description: 'Identificador de la categoría asociada' })
  categoryId: number;

  @ApiProperty({ description: 'Nombre de la categoría', nullable: true })
  categoryName: string | null;

  @ApiProperty({ description: 'Slug de la categoría', nullable: true })
  categorySlug: string | null;

  @ApiProperty({ description: 'Título aprobado para el reporte', nullable: true })
  title: string | null;

  @ApiProperty({ description: 'Descripción aprobada del incidente' })
  description: string;

  @ApiProperty({ description: 'URL del incidente reportado' })
  incidentUrl: string;

  @ApiProperty({ description: 'Host del medio o publicador original' })
  publisherHost: string;

  @ApiProperty({ description: 'Promedio de calificaciones aprobado', example: 4.5, type: Number })
  ratingAverage: number;

  @ApiProperty({ description: 'Cantidad de calificaciones registradas', example: 12 })
  ratingCount: number;

  @ApiProperty({ description: 'Fecha de publicación', nullable: true })
  publishedAt: string | null;

  @ApiProperty({ description: 'Fecha de aprobación', nullable: true })
  approvedAt: string | null;
}

export class ReportsInsightsTopHostDto {
  @ApiProperty({ description: 'Host analizado' })
  host: string;

  @ApiProperty({ description: 'Cantidad de reportes aprobados asociados a este host' })
  reportCount: number;

  @ApiProperty({ description: 'Promedio de calificaciones agregadas para el host', example: 4.2, nullable: true })
  averageRating: number | null;

  @ApiProperty({ description: 'Total de calificaciones recibidas por los reportes del host' })
  totalRatings: number;
}

export class ReportsInsightsDto {
  @ApiProperty({ type: [ReportsInsightsTopHostDto] })
  topHosts: ReportsInsightsTopHostDto[];
}

export class GetReportsResponseDto {
  @ApiProperty({ type: [ReportFeedItemDto] })
  feed: ReportFeedItemDto[];

  @ApiProperty({ type: ReportsInsightsDto })
  insights: ReportsInsightsDto;
}
