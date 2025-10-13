/* eslint-disable prettier/prettier */

import { Body, Controller, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { AuthenticatedRequest } from "src/common/interfaces/authenticated-request";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserPasswordDto } from "./dto/update-user-password.dto";
import { UpdateUserProfileDto } from "./dto/update-user-profile.dto";
import { UserResponseDto, toUserResponseDto } from "./dto/user-response.dto";
import { UserService } from "./user.service";

@ApiTags("Endpoints de Usuarios")
@Controller("users")
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post()
    @Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 requests per hour
    @ApiResponse({ status: 201, description: "Usuario creado exitosamente", type: UserResponseDto })
    @ApiResponse({ status: 500, description: "Error interno del servidor" })
    async registerUser(@Body() userDto: CreateUserDto): Promise<UserResponseDto> {
        const user = await this.userService.registerUser(userDto);
        return toUserResponseDto(user);
    }

    @Patch("me")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Actualizar el perfil del usuario autenticado" })
    @ApiOkResponse({ description: "Perfil actualizado correctamente", type: UserResponseDto })
    async updateProfile(
        @Req() req: AuthenticatedRequest,
        @Body() dto: UpdateUserProfileDto,
    ): Promise<UserResponseDto> {
        const updatedUser = await this.userService.updateProfile(Number(req.user.userId), dto);
        return toUserResponseDto(updatedUser);
    }

    @Patch("me/password")
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Actualizar la contrase\u00f1a del usuario autenticado" })
    @ApiOkResponse({ description: "Contrase\u00f1a actualizada correctamente" })
    async updatePassword(
        @Req() req: AuthenticatedRequest,
        @Body() dto: UpdateUserPasswordDto,
    ): Promise<{ message: string }> {
        await this.userService.changePassword(Number(req.user.userId), dto);
        return { message: "Contrase\u00f1a actualizada correctamente" };
    }
}


