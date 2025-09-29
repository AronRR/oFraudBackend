import { ApiProperty } from '@nestjs/swagger';

export class MetricsTopCategoryDto {
  @ApiProperty({ description: 'Identificador de la categoría' })
  id!: number;

  @ApiProperty({ description: 'Nombre visible de la categoría' })
  name!: string;

  @ApiProperty({ description: 'Slug asociado a la categoría' })
  slug!: string;

  @ApiProperty({ description: 'Cantidad de reportes aprobados asociados a la categoría' })
  reportsCount!: number;

  @ApiProperty({ description: 'Cantidad de búsquedas registradas para la categoría' })
  searchCount!: number;
}
