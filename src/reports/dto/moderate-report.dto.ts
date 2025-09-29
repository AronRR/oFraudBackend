/* eslint-disable prettier/prettier */

import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class ModerateReportDto {
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @IsInt()
  reportId: number;

  @IsOptional()
  @IsInt()
  revisionId?: number;

  @IsOptional()
  @IsInt()
  rejectionReasonId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  rejectionReasonCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  rejectionReasonText?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string | null;
}
