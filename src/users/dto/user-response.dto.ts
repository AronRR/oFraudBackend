import { ApiProperty } from "@nestjs/swagger";
import type { User, UserRole } from "../user.repository";

export class UserResponseDto {
    @ApiProperty({ example: 1, description: "Identificador unico del usuario" })
    id!: number;

    @ApiProperty({ example: "user@example.com", description: "Correo electronico del usuario" })
    email!: string;

    @ApiProperty({ example: "user123", description: "Nombre de usuario" })
    username!: string;

    @ApiProperty({ example: "Juan", description: "Nombre" })
    firstName!: string;

    @ApiProperty({ example: "Perez", description: "Apellido" })
    lastName!: string;

    @ApiProperty({ example: "+34999888777", description: "Telefono de contacto", nullable: true })
    phoneNumber!: string | null;

    @ApiProperty({ enum: ["user", "admin"], example: "user" })
    role!: UserRole;

    @ApiProperty({ example: false, description: "Indica si la cuenta esta bloqueada" })
    isBlocked!: boolean;

    @ApiProperty({ example: "Cuenta bloqueada por fraude", nullable: true })
    blockedReason!: string | null;

    @ApiProperty({ example: 42, nullable: true })
    blockedBy!: number | null;

    @ApiProperty({ type: String, example: "2025-09-28T20:45:00.000Z", nullable: true })
    blockedAt!: Date | null;
}

export function toUserResponseDto(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.username = user.username;
    dto.firstName = user.first_name;
    dto.lastName = user.last_name;
    dto.phoneNumber = user.phone_number;
    dto.role = user.role;
    dto.isBlocked = user.is_blocked === true || user.is_blocked === 1;
    dto.blockedReason = user.blocked_reason;
    dto.blockedBy = user.blocked_by;
    dto.blockedAt = user.blocked_at;
    return dto;
}
