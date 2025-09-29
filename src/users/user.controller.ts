/* eslint-disable prettier/prettier */

import { Body, Controller, Post } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { CreateUserDto } from "./dto/create-user.dto";
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
}
