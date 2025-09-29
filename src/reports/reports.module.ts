import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportRepository } from './report.repository';
import { RejectionReasonRepository } from './rejection-reason.repository';
import { RejectionReasonSeeder } from './rejection-reason.seeder';
import { ReportRatingRepository } from './report-rating.repository';
import { ReportCommentRepository } from './report-comment.repository';
import { ReportFlagRepository } from './report-flag.repository';

@Module({
  imports: [AuthModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportRepository,
    RejectionReasonRepository,
    RejectionReasonSeeder,
    ReportRatingRepository,
    ReportCommentRepository,
    ReportFlagRepository,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
