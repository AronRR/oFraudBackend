import { ApiProperty } from '@nestjs/swagger';

export class TopCategoryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Phishing' })
  name: string;

  @ApiProperty({ example: 'phishing' })
  slug: string;

  @ApiProperty({ example: 150 })
  reportsCount: number;

  @ApiProperty({ example: 89 })
  searchCount: number;

  @ApiProperty({ example: 239 })
  totalActivity: number;
}
