import { ApiProperty } from '@nestjs/swagger';

export class ReportRatingSummaryDto {
  @ApiProperty()
  average: number;

  @ApiProperty()
  count: number;
}

export class ReportRatingResponseDto {
  @ApiProperty()
  ratingId: number;

  @ApiProperty()
  reportId: number;

  @ApiProperty()
  userId: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  score: number;

  @ApiProperty({ required: false, nullable: true })
  comment: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({ type: ReportRatingSummaryDto })
  summary: ReportRatingSummaryDto;
}

export class DeleteReportRatingResponseDto {
  @ApiProperty({ type: ReportRatingSummaryDto })
  summary: ReportRatingSummaryDto;
}
