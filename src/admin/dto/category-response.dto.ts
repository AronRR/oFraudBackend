import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ description: 'Identificador de la categoría' })
  id!: number;

  @ApiProperty({ description: 'Nombre visible de la categoría' })
  name!: string;

  @ApiProperty({ description: 'Slug único para búsquedas' })
  slug!: string;

  @ApiProperty({ description: 'Descripción de la categoría', nullable: true })
  description!: string | null;

  @ApiProperty({ description: 'Indica si la categoría acepta nuevos reportes' })
  is_active!: boolean;

  @ApiProperty({ description: 'Cantidad de reportes asociados' })
  reports_count!: number;

  @ApiProperty({ description: 'Cantidad de búsquedas asociadas' })
  search_count!: number;

  @ApiProperty({ description: 'Fecha de creación', type: String })
  created_at!: string;

  @ApiProperty({ description: 'Fecha de última actualización', type: String })
  updated_at!: string;
}
