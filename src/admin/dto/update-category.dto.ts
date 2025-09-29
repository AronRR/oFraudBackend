import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional({ description: 'Cantidad acumulada de reportes aprobados asociados', minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  reports_count?: number;

  @ApiPropertyOptional({ description: 'Cantidad de búsquedas asociadas a la categoría', minimum: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  search_count?: number;
}
