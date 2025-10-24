/* eslint-disable prettier/prettier */

import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { UserModule } from "src/users/user.module";
import { DbModule } from "src/db/db.module";
import { jwtConfig } from "src/config/jwt.config";
import { AuthController } from "./auth.controller";
import { TokenService } from "./tokens.service";
import { RefreshTokenRepository } from "./refresh-token.repository";
import { AdminActionsAuditRepository } from "src/admin/admin-actions-audit.repository";


@Module({
    imports: [forwardRef(() => UserModule), JwtModule.registerAsync(jwtConfig), DbModule],
    controllers: [AuthController],
    providers: [TokenService, RefreshTokenRepository, AdminActionsAuditRepository],
    exports: [TokenService]
})
export class AuthModule {}
