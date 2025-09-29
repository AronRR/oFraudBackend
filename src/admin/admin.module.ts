import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { DbModule } from 'src/db/db.module';
import { AuthModule } from 'src/auth/auth.module';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';
import { ReportRepository } from 'src/reports/report.repository';
import { ReportFlagRepository } from 'src/reports/report-flag.repository';

@Module({
  imports: [DbModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository, ReportRepository, ReportFlagRepository, JwtAuthGuard, AdminRoleGuard],
})
export class AdminModule {}
