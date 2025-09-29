import { ApiProperty } from "@nestjs/swagger";

export class LoginResponseDto {
    @ApiProperty({ example: "Inicio de sesión exitoso", description: "Mensaje informativo de la autenticación" })
    message!: string;

    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", description: "Token de acceso JWT" })
    accessToken!: string;

    @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", description: "Token de refresco JWT" })
    refreshToken!: string;
}
