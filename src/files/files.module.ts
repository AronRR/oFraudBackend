/* eslint-disable prettier/prettier */


import { Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { FileController } from "./file.controller";


@Module({
    imports: [AuthModule],
    controllers: [FileController],
    providers: [JwtAuthGuard],
})
export class FilesModule{}
