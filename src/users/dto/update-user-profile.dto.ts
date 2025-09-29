/* eslint-disable prettier/prettier */

import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Length, Matches } from "class-validator";

export class UpdateUserProfileDto {
    @ApiPropertyOptional({ description: "Nombre del usuario", example: "Juan" })
    @IsOptional()
    @IsString()
    @Length(1, 80)
    firstName?: string;

    @ApiPropertyOptional({ description: "Apellido del usuario", example: "Pérez" })
    @IsOptional()
    @IsString()
    @Length(1, 120)
    lastName?: string;

    @ApiPropertyOptional({ description: "Nombre de usuario único", example: "juan.perez" })
    @IsOptional()
    @IsString()
    @Length(3, 40)
    username?: string;

    @ApiPropertyOptional({
        description: "Teléfono de contacto del usuario",
        example: "+34999888777",
        nullable: true,
    })
    @IsOptional()
    @IsString()
    @Matches(/^[+\d][\d\s\-]{6,}$/u, {
        message: "El teléfono debe contener al menos 7 dígitos y puede incluir el prefijo +",
    })
    phoneNumber?: string | null;
}
