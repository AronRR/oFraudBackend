import { ApiProperty } from '@nestjs/swagger';

export class FraudStatsDto {
  @ApiProperty({ example: 28, description: 'Tiempo promedio de detección de fraude en días' })
  averageDetectionDays: number;

  @ApiProperty({ example: 1247 })
  totalReportsApproved: number;

  @ApiProperty({ example: 89 })
  reportsThisWeek: number;

  @ApiProperty({ example: 342 })
  reportsThisMonth: number;

  @ApiProperty({ example: 567 })
  totalActiveUsers: number;

  @ApiProperty({ example: 42 })
  categoriesCount: number;
}
