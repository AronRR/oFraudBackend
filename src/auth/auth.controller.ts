/* eslint-disable prettier/prettier */

import { Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { AuthenticatedRequest } from "src/common/interfaces/authenticated-request";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { UserService } from "src/users/user.service";
import { LoginRequestDto } from "./dto/login-request.dto";
import { LoginResponseDto } from "./dto/login-response.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { TokenService } from "./tokens.service";
import { AdminActionsAuditRepository } from "src/admin/admin-actions-audit.repository";

@ApiTags("Auth")
@Controller("auth")
export class AuthController{
    constructor(private readonly tokenService: TokenService,
        private readonly userService: UserService,
        private readonly adminActionsAuditRepository: AdminActionsAuditRepository,
    ){}
    
    @Post("login")
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
    @ApiOperation({ summary: "Iniciar sesión" })
    @ApiBody({ type: LoginRequestDto, description: "Credenciales de acceso" })
    @ApiOkResponse({ description: "Tokens generados correctamente", type: LoginResponseDto })
    async login(@Body() dto: LoginRequestDto, @Req() req: any): Promise<LoginResponseDto>{
        const usuario= await this.userService.login(dto.email, dto.password);
        const userName = `${usuario.first_name} ${usuario.last_name}`.trim() || usuario.username;
        const userProfile = {
            id: usuario.id.toString(),
            email: usuario.email,
            name: userName,
            role: usuario.role,
        };
        const accessToken = await this.tokenService.generateAccess(userProfile);
        const ipAddress = req.ip || req.socket?.remoteAddress;
        const refreshToken= await this.tokenService.generateRefresh(usuario.id.toString(), ipAddress);
        if (usuario.role === 'admin' || usuario.role === 'superadmin') {
            try {
                await this.adminActionsAuditRepository.recordAction({
                    adminId: usuario.id,
                    actionType: 'login',
                    targetType: 'user',
                    targetId: usuario.id,
                    details: { email: usuario.email },
                    ipAddress,
                });
            } catch (error) {
                // No interrumpir el flujo de inicio de sesión si la auditoría falla.
            }
        }
        return { message: "Inicio de sesión exitoso", accessToken, refreshToken };
    }

    @Get("profile")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Obtener perfil del usuario autenticado" })
    @ApiOkResponse({
        description: "Perfil del usuario obtenido correctamente",
        schema: {
            type: "object",
            properties: {
                profile: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        email: { type: "string" },
                        name: { type: "string" },
                        role: { type: "string" }
                    }
                }
            }
        }
    })
    getProfile(@Req() req: AuthenticatedRequest){
        return {profile: req.user.profile}
    }

    @Post("refresh")
    @ApiOperation({ summary: "Renovar token de acceso usando refresh token" })
    @ApiBody({ type: RefreshTokenDto, description: "Refresh token válido" })
    @ApiOkResponse({
        description: "Token de acceso renovado correctamente",
        schema: {
            type: "object",
            properties: {
                accessToken: { type: "string", description: "Nuevo token de acceso JWT" }
            }
        }
    })
    async refresh(@Body() dto: RefreshTokenDto){
        try{
            const profile= await this.tokenService.verifyRefresh(dto.refreshToken);
            const user= await this.userService.findById(Number(profile.sub));
            if(!user) throw Error("Usuario no encontrado");
            const userName = `${user.first_name} ${user.last_name}`.trim() || user.username;
            const newAccessToken = await this.tokenService.generateAccess({
                id: user.id.toString(),
                email: user.email,
                name: userName,
                role: user.role,
            });
            return {accessToken: newAccessToken};
        }catch(error){
            // TODO: Consider implementing rate limiting or logging for repeated refresh failures.
            throw new UnauthorizedException("Token de refresco inválido");
        }
    }

    @Post("logout")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Cerrar sesión y revocar refresh token" })
    @ApiBody({ type: RefreshTokenDto, description: "Refresh token a revocar" })
    @ApiOkResponse({
        description: "Sesión cerrada correctamente",
        schema: {
            type: "object",
            properties: {
                message: { type: "string" }
            }
        }
    })
    async logout(@Body() dto: RefreshTokenDto, @Req() req: AuthenticatedRequest){
        try{
            await this.tokenService.revokeRefreshToken(dto.refreshToken, "Usuario cerró sesión");
            return { message: "Sesión cerrada correctamente" };
        }catch(error){
            throw new UnauthorizedException("Token de refresco inválido");
        }
    }

}
