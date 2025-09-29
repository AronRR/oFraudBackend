import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateReportCommentDto {
  @ApiProperty({ maxLength: 2000 })
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
