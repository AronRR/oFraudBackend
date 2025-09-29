import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ReportFlagStatus } from 'src/reports/report-flag.repository';

const RESOLUTION_STATUSES = ['validated', 'dismissed'] as const;
type ResolutionStatus = (typeof RESOLUTION_STATUSES)[number];

export class ResolveReportFlagDto {
  @ApiProperty({ description: 'Nuevo estado para el flag', enum: RESOLUTION_STATUSES })
  @IsIn(RESOLUTION_STATUSES)
  status!: ResolutionStatus;
}
