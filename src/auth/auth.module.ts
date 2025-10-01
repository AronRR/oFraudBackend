/* eslint-disable prettier/prettier */

import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { UserModule } from "src/users/user.module";
import { jwtConfig } from "src/config/jwt.config";
import { AuthController } from "./auth.controller";
import { TokenService } from "./tokens.service";


@Module({
    imports: [forwardRef(() => UserModule), JwtModule.registerAsync(jwtConfig)],
    controllers: [AuthController],
    providers: [TokenService],
    exports: [TokenService]
})
export class AuthModule {}
