/* eslint-disable prettier/prettier */

import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class UpdateUserPasswordDto {
    @ApiProperty({ description: "Contraseña actual del usuario", example: "Actual123!" })
    @IsString()
    @IsNotEmpty()
    currentPassword!: string;

    @ApiProperty({ description: "Nueva contraseña a establecer", example: "NuevaContraseña456!" })
    @IsString()
    @MinLength(8)
    newPassword!: string;
}
