/* eslint-disable prettier/prettier */

import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { UserRepository } from "./user.repository";
import { UserProfileAuditRepository } from "./audit/user-profile-audit.repository";
import { UserSecurityAuditRepository } from "./audit/user-security-audit.repository";

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UserController],
  providers: [UserRepository, UserProfileAuditRepository, UserSecurityAuditRepository, UserService, JwtAuthGuard],
  exports: [UserService]
})
export class UserModule {}

