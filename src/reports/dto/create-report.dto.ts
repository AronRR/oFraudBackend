/* eslint-disable prettier/prettier */

import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReportMediaDto {
  @IsUrl({ require_tld: false })
  fileUrl: string;

  @IsIn(['image', 'video'])
  mediaType: 'image' | 'video';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  position?: number;
}

export class CreateReportDto {
  @IsInt()
  categoryId: number;

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
  isAnonymous?: boolean = false;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  publisherHost?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => CreateReportMediaDto)
  media: CreateReportMediaDto[];
}
