/* eslint-disable prettier/prettier */

import { ApiProperty } from '@nestjs/swagger';

export class ReportDetailCategoryDto {
  @ApiProperty({ description: 'Identificador de la categoría asociada al reporte' })
  id: number;

  @ApiProperty({ description: 'Nombre visible de la categoría', nullable: true })
  name: string | null;

  @ApiProperty({ description: 'Slug público de la categoría', nullable: true })
  slug: string | null;
}

export class ReportDetailAuthorDto {
  @ApiProperty({ description: 'Indica si el reporte fue publicado en modo anónimo' })
  isAnonymous: boolean;

  @ApiProperty({ description: 'Identificador del autor cuando no es anónimo', nullable: true })
  authorId: number | null;

  @ApiProperty({ description: 'Nombre a mostrar del autor si está disponible', nullable: true })
  displayName: string | null;
}

export class ReportDetailMediaDto {
  @ApiProperty({ description: 'Identificador del archivo asociado a la revisión' })
  mediaId: number;

  @ApiProperty({ description: 'URL pública del recurso' })
  fileUrl: string;

  @ApiProperty({ description: 'Tipo de archivo almacenado', nullable: true })
  mediaType: string | null;

  @ApiProperty({ description: 'Posición relativa del recurso en la galería', example: 1 })
  position: number;
}

export class ReportDetailDto {
  @ApiProperty({ description: 'Identificador único del reporte aprobado' })
  reportId: number;

  @ApiProperty({ description: 'Título aprobado del reporte', nullable: true })
  title: string | null;

  @ApiProperty({ description: 'Descripción aprobada del incidente reportado' })
  description: string;

  @ApiProperty({ description: 'URL del incidente publicado' })
  incidentUrl: string;

  @ApiProperty({ description: 'Host del medio o publicador original' })
  publisherHost: string;

  @ApiProperty({ description: 'Fecha de creación del reporte en formato ISO 8601' })
  createdAt: string;

  @ApiProperty({ description: 'Fecha de aprobación, si está disponible', nullable: true })
  approvedAt: string | null;

  @ApiProperty({ description: 'Fecha de publicación, si aplica', nullable: true })
  publishedAt: string | null;

  @ApiProperty({ description: 'Categoría asociada al reporte', type: ReportDetailCategoryDto, nullable: true })
  category: ReportDetailCategoryDto | null;

  @ApiProperty({ description: 'Información pública del autor según configuración de anonimato' })
  author: ReportDetailAuthorDto;

  @ApiProperty({ type: [ReportDetailMediaDto], description: 'Listado de archivos aprobados para la revisión' })
  media: ReportDetailMediaDto[];

  @ApiProperty({ description: 'Promedio de calificaciones del reporte', example: 4.5, type: Number })
  ratingAverage: number;

  @ApiProperty({ description: 'Cantidad de calificaciones recibidas', example: 12 })
  ratingCount: number;
}
