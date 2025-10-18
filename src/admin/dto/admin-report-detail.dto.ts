import { ApiProperty } from '@nestjs/swagger';
import { ReportDetailDto } from 'src/reports/dto/report-detail.dto';
import type { ReportStatus } from 'src/reports/report.repository';

const REPORT_STATUS_VALUES: ReportStatus[] = ['pending', 'approved', 'rejected', 'removed'];

export class AdminReportDetailDto extends ReportDetailDto {
  @ApiProperty({ enum: REPORT_STATUS_VALUES })
  status: ReportStatus;

  @ApiProperty({ nullable: true })
  reviewNotes: string | null;

  @ApiProperty({ nullable: true })
  rejectionReasonText: string | null;
}

