import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Nombre visible de la categoría', example: 'Fake News' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ description: 'Slug único para búsquedas', example: 'fake-news' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  slug!: string;

  @ApiPropertyOptional({ description: 'Descripción de la categoría', example: 'Reportes relacionados a información falsa' })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ description: 'Si la categoría está activa para nuevos reportes', default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
