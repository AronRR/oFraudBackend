import { ApiProperty } from '@nestjs/swagger';

export class EducationalTipDto {
  @ApiProperty()
  icon: string;

  @ApiProperty()
  text: string;
}

export class EducationalStepDto {
  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;
}

export class EducationalContentDto {
  @ApiProperty()
  topic: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [EducationalTipDto], required: false })
  tips?: EducationalTipDto[];

  @ApiProperty({ type: [EducationalStepDto], required: false })
  steps?: EducationalStepDto[];

  @ApiProperty({ required: false })
  additionalInfo?: string;
}
