/* eslint-disable prettier/prettier */

import { IsIn, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class AddMediaDto {
  @IsInt()
  revisionId: number;

  @IsUrl({ require_tld: false })
  fileUrl: string;

  @IsOptional()
  @IsString()
  storageKey?: string | null;

  @IsOptional()
  @IsIn(['image', 'video', 'file'])
  mediaType?: 'image' | 'video' | 'file';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  position?: number;
}
