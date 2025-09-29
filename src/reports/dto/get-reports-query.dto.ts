/* eslint-disable prettier/prettier */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export enum ReportsFeedSort {
  RECENT = 'recent',
  RATING = 'rating',
  POPULAR = 'popular',
}

export class GetReportsQueryDto {
  @ApiPropertyOptional({ description: 'Identificador de la categoría a filtrar', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Nombre del host de la fuente original', example: 'news.example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  host?: string;

  @ApiPropertyOptional({ description: 'Texto de búsqueda aplicado sobre título, descripción y host', example: 'fraude' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  search?: string;

  @ApiPropertyOptional({ description: 'Criterio de ordenamiento del feed', enum: ReportsFeedSort, default: ReportsFeedSort.RECENT })
  @IsOptional()
  @IsEnum(ReportsFeedSort)
  sort?: ReportsFeedSort;
}
