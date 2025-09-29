/* eslint-disable prettier/prettier */

import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserPasswordDto } from "./dto/update-user-password.dto";
import { UpdateUserProfileDto } from "./dto/update-user-profile.dto";
import { User, UserRepository } from "./user.repository";

@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    async registerUser(createUserDto: CreateUserDto): Promise<User> {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

        try {
            return await this.userRepository.registerUser({
                email: createUserDto.email,
                username: createUserDto.username,
                first_name: createUserDto.firstName,
                last_name: createUserDto.lastName,
                phone_number: createUserDto.phoneNumber ?? null,
                password_hash: hashedPassword,
                password_salt: salt,
                role: createUserDto.role ?? "user",
            });
        } catch (error) {
            if (this.isDuplicateEntryError(error)) {
                throw new ConflictException("El email o nombre de usuario ya existe");
            }
            throw error;
        }
    }

    async login(email: string, password: string): Promise<User> {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new UnauthorizedException("Usuario no encontrado");
        }

        if (this.isUserBlocked(user)) {
            await this.recordBlockedLoginAttempt(user);
            throw new ForbiddenException(user.blocked_reason ?? "La cuenta está bloqueada");
        }

        let isPasswordValid = false;
        try {
            isPasswordValid = await bcrypt.compare(password, user.password_hash);
        } catch (error) {
            isPasswordValid = false;
        }
        if (!isPasswordValid) {
            throw new UnauthorizedException("Contraseña incorrecta");
        }
        return user;
    }

    async findById(id: number): Promise<User | null> {
        return this.userRepository.findById(id);
    }

    async updateProfile(userId: number, dto: UpdateUserProfileDto): Promise<User> {
        const hasProfileChanges =
            dto.firstName !== undefined ||
            dto.lastName !== undefined ||
            dto.username !== undefined ||
            dto.phoneNumber !== undefined;

        if (!hasProfileChanges) {
            throw new BadRequestException("No se recibieron cambios para actualizar");
        }

        const sanitizedFirstName = this.sanitizeOptionalName(dto.firstName, "El nombre no puede estar vacío");
        const sanitizedLastName = this.sanitizeOptionalName(dto.lastName, "El apellido no puede estar vacío");
        const sanitizedUsername = this.sanitizeOptionalName(
            dto.username,
            "El nombre de usuario no puede estar vacío",
        );

        let sanitizedPhone: string | null | undefined = undefined;
        if (dto.phoneNumber !== undefined) {
            if (dto.phoneNumber === null) {
                sanitizedPhone = null;
            } else {
                const trimmedPhone = dto.phoneNumber.trim();
                if (trimmedPhone.length === 0) {
                    sanitizedPhone = null;
                } else {
                    sanitizedPhone = trimmedPhone;
                }
            }
        }

        const updatePayload: {
            first_name?: string;
            last_name?: string;
            username?: string;
            phone_number?: string | null;
        } = {};

        if (sanitizedFirstName !== undefined) {
            updatePayload.first_name = sanitizedFirstName;
        }
        if (sanitizedLastName !== undefined) {
            updatePayload.last_name = sanitizedLastName;
        }
        if (sanitizedUsername !== undefined) {
            updatePayload.username = sanitizedUsername;
        }
        if (dto.phoneNumber !== undefined) {
            updatePayload.phone_number = sanitizedPhone ?? null;
        }

        try {
            const updatedUser = await this.userRepository.updateProfile(userId, updatePayload);

            if (!updatedUser) {
                throw new NotFoundException("Usuario no encontrado");
            }

            return updatedUser;
        } catch (error) {
            if (this.isDuplicateEntryError(error)) {
                throw new ConflictException("El nombre de usuario ya existe");
            }
            throw error;
        }
    }

    async changePassword(userId: number, dto: UpdateUserPasswordDto): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundException("Usuario no encontrado");
        }

        const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password_hash);
        if (!isPasswordValid) {
            throw new UnauthorizedException("La contraseña actual es incorrecta");
        }

        if (dto.currentPassword === dto.newPassword) {
            throw new BadRequestException("La nueva contraseña debe ser diferente a la actual");
        }

        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(dto.newPassword, salt);
        await this.userRepository.updatePassword(userId, hashedPassword, salt);
    }

    private isDuplicateEntryError(error: unknown): boolean {
        return (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: string }).code === "ER_DUP_ENTRY"
        );
    }

    private sanitizeOptionalName(value: string | undefined, emptyMessage: string): string | undefined {
        if (value === undefined) {
            return undefined;
        }

        const trimmed = value.trim();
        if (!trimmed) {
            throw new BadRequestException(emptyMessage);
        }
        return trimmed;
    }

    private isUserBlocked(user: User): boolean {
        return user.is_blocked === true || user.is_blocked === 1;
    }

    private async recordBlockedLoginAttempt(user: User): Promise<void> {
        if (!user.blocked_by) return;
        try {
            await this.userRepository.recordBlockedLoginAttempt(
                user.id,
                user.blocked_by,
                user.blocked_reason ?? null,
            );
        } catch {
            // La auditoría no debe impedir la respuesta al usuario.
        }
    }
}
