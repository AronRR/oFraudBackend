/* eslint-disable prettier/prettier */

import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "src/common/interfaces/authenticated-request";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { UserService } from "src/users/user.service";
import { LoginRequestDto } from "./dto/login-request.dto";
import { LoginResponseDto } from "./dto/login-response.dto";
import { TokenService } from "./tokens.service";

@ApiTags("Auth")
@Controller("auth")
export class AuthController{
    constructor(private readonly tokenService: TokenService,
        private readonly userService: UserService
    ){}
    
    @Post("login")
    @ApiOperation({ summary: "Iniciar sesión" })
    @ApiBody({ type: LoginRequestDto, description: "Credenciales de acceso" })
    @ApiOkResponse({ description: "Tokens generados correctamente", type: LoginResponseDto })
    async login(@Body() dto: LoginRequestDto): Promise<LoginResponseDto>{
        const usuario= await this.userService.login(dto.email, dto.password);
        const userName = `${usuario.first_name} ${usuario.last_name}`.trim() || usuario.username;
        const userProfile = {
            id: usuario.id.toString(),
            email: usuario.email,
            name: userName,
            role: usuario.role,
        };
        const accessToken = await this.tokenService.generateAccess(userProfile);
        const refreshToken= await this.tokenService.generateRefresh(usuario.id.toString());
        return { message: "Inicio de sesión exitoso", accessToken, refreshToken };
    }

    @Get("profile")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    getProfile(@Req() req: AuthenticatedRequest){
        return {profile: req.user.profile}
    }

    @Post("refresh")
    async refresh(@Body() dto: {refreshToken: string}){
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
        }catch{
            throw Error("Token de refresco inválido");
        }
    }

}
