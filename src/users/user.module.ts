/* eslint-disable prettier/prettier */

import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { UserRepository } from "./user.repository";

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UserController],
  providers: [UserRepository, UserService, JwtAuthGuard],
  exports: [UserService]
})
export class UserModule {}
