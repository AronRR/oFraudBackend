/* eslint-disable prettier/prettier */

import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportRepository } from './report.repository';
import { RejectionReasonRepository } from './rejection-reason.repository';
import { RejectionReasonSeeder } from './rejection-reason.seeder';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportRepository, RejectionReasonRepository, RejectionReasonSeeder],
  exports: [ReportsService],
})
export class ReportsModule {}
