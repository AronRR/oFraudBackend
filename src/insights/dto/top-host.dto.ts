import { ApiProperty } from '@nestjs/swagger';

export class TopHostDto {
  @ApiProperty({ example: 'ejemplo-fraude.com' })
  host: string;

  @ApiProperty({ example: 42 })
  reportCount: number;

  @ApiProperty({ example: 3.5, nullable: true })
  averageRating: number | null;

  @ApiProperty({ example: 28 })
  totalRatings: number;
}
