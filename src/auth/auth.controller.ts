/* eslint-disable prettier/prettier */

import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import type { AuthenticatedRequest } from "src/common/interfaces/authenticated-request";
import { UserRole } from "src/users/user.types";
import { UserService } from "src/users/user.service";
import { TokenService, UserProfile } from "./tokens.service";

@Controller("auth")
export class AuthController {
    constructor(
        private readonly tokenService: TokenService,
        private readonly userService: UserService,
    ) {}

    @Post("login")
    async login(@Body() dto: { email: string; password: string }) {
        const user = await this.userService.login(dto.email, dto.password);
        if (!user) {
            throw Error("Usuario no encontrado");
        }
        const userProfile: UserProfile = {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role ?? ("user" as UserRole),
        };
        const accessToken = await this.tokenService.generateAccess(userProfile);
        const refreshToken = await this.tokenService.generateRefresh(user.id.toString());
        return { accessToken, refreshToken };
    }

    @Get("profile")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    getProfile(@Req() req: AuthenticatedRequest) {
        return { profile: req.user.profile };
    }

    @Post("refresh")
    async refresh(@Body() dto: { refreshToken: string }) {
        try {
            const payload = await this.tokenService.verifyRefresh(dto.refreshToken);
            const user = await this.userService.findById(Number(payload.sub));
            if (!user) throw Error("Usuario no encontrado");
            const newAccessToken = await this.tokenService.generateAccess({
                id: user.id.toString(),
                email: user.email,
                name: user.name,
                role: user.role ?? ("user" as UserRole),
            });
            return { accessToken: newAccessToken };
        } catch {
            throw Error("Token de refresco inválido");
        }
    }
}
