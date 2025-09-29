import { ApiProperty } from '@nestjs/swagger';
import { REPORT_FLAG_REASONS, REPORT_FLAG_STATUSES, ReportFlagReason, ReportFlagStatus } from '../report-flag.repository';

export class ReportFlagResponseDto {
  @ApiProperty()
  flagId!: number;

  @ApiProperty()
  reportId!: number;

  @ApiProperty({ enum: REPORT_FLAG_STATUSES })
  status!: ReportFlagStatus;

  @ApiProperty({ enum: REPORT_FLAG_REASONS })
  reasonCode!: ReportFlagReason;

  @ApiProperty({ nullable: true })
  details!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ nullable: true })
  handledAt!: string | null;
}
