import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { REPORT_FLAG_REASONS, ReportFlagReason } from '../report-flag.repository';

export class CreateReportFlagDto {
  @ApiProperty({ enum: REPORT_FLAG_REASONS })
  @IsIn(REPORT_FLAG_REASONS)
  reasonCode: ReportFlagReason;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string | null;
}
