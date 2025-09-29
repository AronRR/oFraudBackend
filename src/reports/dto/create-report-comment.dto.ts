import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, MaxLength, Min } from 'class-validator';

export class CreateReportCommentDto {
  @ApiProperty({ maxLength: 2000 })
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentCommentId?: number | null;
}
