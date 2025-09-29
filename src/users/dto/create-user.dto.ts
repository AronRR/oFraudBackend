/* eslint-disable prettier/prettier */

import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "../user.repository";

export class CreateUserDto {
    @ApiProperty({ example: "user@example.com", description: "Email del usuario" })
    email: string;

    @ApiProperty({ example: "user123", description: "Nombre de usuario único" })
    username: string;

    @ApiProperty({ example: "Juan", description: "Nombre del usuario" })
    firstName: string;

    @ApiProperty({ example: "Pérez", description: "Apellido del usuario" })
    lastName: string;

    @ApiProperty({ example: "+34999888777", description: "Teléfono de contacto", required: false })
    phoneNumber?: string;

    @ApiProperty({ example: "password123", description: "Contraseña del usuario" })
    password: string;

    @ApiProperty({ enum: ["user", "admin", "moderator"], required: false, description: "Rol del usuario" })
    role?: UserRole;
}
