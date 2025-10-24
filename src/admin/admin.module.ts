import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { AdminActionsAuditRepository } from './admin-actions-audit.repository';
import { DbModule } from 'src/db/db.module';
import { AuthModule } from 'src/auth/auth.module';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';
import { SuperAdminRoleGuard } from 'src/common/guards/superadmin-role.guard';
import { ReportRepository } from 'src/reports/report.repository';
import { ReportFlagRepository } from 'src/reports/report-flag.repository';
import { UserRepository } from 'src/users/user.repository';
import { UserProfileAuditRepository } from 'src/users/audit/user-profile-audit.repository';
import { UserSecurityAuditRepository } from 'src/users/audit/user-security-audit.repository';

@Module({
  imports: [DbModule, AuthModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminRepository,
    AdminActionsAuditRepository,
    ReportRepository,
    ReportFlagRepository,
    UserRepository,
    UserProfileAuditRepository,
    UserSecurityAuditRepository,
    JwtAuthGuard,
    AdminRoleGuard,
    SuperAdminRoleGuard,
  ],
})
export class AdminModule {}
