import { ApiProperty } from '@nestjs/swagger';

export class ReportCommentDto {
  @ApiProperty()
  commentId: number;

  @ApiProperty()
  reportId: number;

  @ApiProperty()
  userId: number;

  @ApiProperty({ nullable: true })
  parentCommentId: number | null;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class ReportCommentsMetaDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;
}

export class GetReportCommentsResponseDto {
  @ApiProperty({ type: [ReportCommentDto] })
  items: ReportCommentDto[];

  @ApiProperty({ type: ReportCommentsMetaDto })
  meta: ReportCommentsMetaDto;
}
