/* eslint-disable prettier/prettier */

import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportRepository } from './report.repository';
import { RejectionReasonRepository } from './rejection-reason.repository';
import { RejectionReasonSeeder } from './rejection-reason.seeder';

@Module({
  imports: [AuthModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportRepository, RejectionReasonRepository, RejectionReasonSeeder],
  exports: [ReportsService],
})
export class ReportsModule {}
