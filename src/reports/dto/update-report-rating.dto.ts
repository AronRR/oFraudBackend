import { PartialType } from '@nestjs/swagger';
import { CreateReportRatingDto } from './create-report-rating.dto';

export class UpdateReportRatingDto extends PartialType(CreateReportRatingDto) {}
