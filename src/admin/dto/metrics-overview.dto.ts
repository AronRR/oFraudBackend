import { ApiProperty } from '@nestjs/swagger';

export class MetricsOverviewDto {
  @ApiProperty({ description: 'Total de usuarios registrados' })
  totalUsers!: number;

  @ApiProperty({ description: 'Usuarios con el estado bloqueado activo' })
  blockedUsers!: number;

  @ApiProperty({ description: 'Reportes totales registrados' })
  totalReports!: number;

  @ApiProperty({ description: 'Reportes aprobados publicados' })
  approvedReports!: number;

  @ApiProperty({ description: 'Reportes pendientes de revisión' })
  pendingReports!: number;
}
