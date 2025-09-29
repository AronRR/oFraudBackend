/* eslint-disable prettier/prettier */

import { Body, Controller, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedRequest } from "src/common/interfaces/authenticated-request";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserPasswordDto } from "./dto/update-user-password.dto";
import { UpdateUserProfileDto } from "./dto/update-user-profile.dto";
import { User } from "./user.repository";
import { UserService } from "./user.service";

@ApiTags("Endpoints de Usuarios")
@Controller("users")
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post()
    @ApiResponse({ status: 201, description: "Usuario creado exitosamente" })
    @ApiResponse({ status: 500, description: "Error interno del servidor" })
    async registerUser(@Body() userDto: CreateUserDto): Promise<User> {
        return this.userService.registerUser(userDto);
    }

    @Patch("me")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Actualizar el perfil del usuario autenticado" })
    @ApiOkResponse({ description: "Perfil actualizado correctamente" })
    async updateProfile(
        @Req() req: AuthenticatedRequest,
        @Body() dto: UpdateUserProfileDto,
    ): Promise<User> {
        return this.userService.updateProfile(Number(req.user.userId), dto);
    }

    @Patch("me/password")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Actualizar la contraseña del usuario autenticado" })
    @ApiOkResponse({ description: "Contraseña actualizada correctamente" })
    async updatePassword(
        @Req() req: AuthenticatedRequest,
        @Body() dto: UpdateUserPasswordDto,
    ): Promise<{ message: string }> {
        await this.userService.changePassword(Number(req.user.userId), dto);
        return { message: "Contraseña actualizada correctamente" };
    }
}
