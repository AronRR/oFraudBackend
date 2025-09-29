/* eslint-disable prettier/prettier */

import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string | null;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsUrl({ require_tld: false })
  incidentUrl: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  publisherHost?: string | null;
}
