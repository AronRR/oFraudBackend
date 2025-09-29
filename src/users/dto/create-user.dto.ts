/* eslint-disable prettier/prettier */

import { ApiProperty } from "@nestjs/swagger";
import {
    IsEmail,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    MinLength,
} from "class-validator";
import type { UserRole } from "../user.repository";

export class CreateUserDto {
    @ApiProperty({ example: "user@example.com", description: "Email del usuario" })
    @IsEmail({}, { message: "El correo electrónico debe ser válido" })
    email!: string;

    @ApiProperty({ example: "user123", description: "Nombre de usuario único" })
    @IsString()
    @Matches(/^[a-zA-Z0-9._-]{3,30}$/u, {
        message: "El nombre de usuario debe tener entre 3 y 30 caracteres y solo puede incluir letras, números, puntos, guiones y guiones bajos",
    })
    username!: string;

    @ApiProperty({ example: "Juan", description: "Nombre del usuario" })
    @IsString()
    @IsNotEmpty()
    firstName!: string;

    @ApiProperty({ example: "Pérez", description: "Apellido del usuario" })
    @IsString()
    @IsNotEmpty()
    lastName!: string;

    @ApiProperty({ example: "+34999888777", description: "Teléfono de contacto", required: false })
    @IsOptional()
    @IsString()
    @Matches(/^[+\d][\d\s\-]{6,}$/u, {
        message: "El teléfono debe contener al menos 7 dígitos y puede incluir espacios, guiones o el prefijo +",
    })
    phoneNumber?: string;

    @ApiProperty({ example: "password123", description: "Contraseña del usuario" })
    @IsString()
    @MinLength(8, { message: "La contraseña debe tener al menos 8 caracteres" })
    @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/u, {
        message: "La contraseña debe incluir al menos una letra y un número",
    })
    password!: string;

    @ApiProperty({ enum: ["user", "admin"], required: false, description: "Rol del usuario" })
    @IsOptional()
    @IsIn(["user", "admin"])
    role?: UserRole;
}
