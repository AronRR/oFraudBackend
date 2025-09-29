import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginRequestDto {
    @ApiProperty({ example: "user@example.com", description: "Correo electrónico registrado" })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: "StrongPassword123", description: "Contraseña del usuario" })
    @IsString()
    @MinLength(6)
    password!: string;
}
