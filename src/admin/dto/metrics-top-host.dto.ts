import { ApiProperty } from '@nestjs/swagger';

export class MetricsTopHostDto {
  @ApiProperty({ description: 'Host del medio o sitio reportado' })
  host!: string;

  @ApiProperty({ description: 'Cantidad total de reportes asociados al host' })
  reportsCount!: number;

  @ApiProperty({ description: 'Cantidad de reportes aprobados para el host' })
  approvedReportsCount!: number;

  @ApiProperty({ description: 'Cantidad de reportes pendientes para el host' })
  pendingReportsCount!: number;

  @ApiProperty({ description: 'Cantidad de reportes rechazados para el host' })
  rejectedReportsCount!: number;

  @ApiProperty({ description: 'Cantidad de reportes eliminados para el host' })
  removedReportsCount!: number;
}
