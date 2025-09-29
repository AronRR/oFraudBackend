/* eslint-disable prettier/prettier */

import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { CreateUserDto } from "./dto/create-user.dto";
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
        if (!user) throw Error("Usuario no encontrado");

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

    private isDuplicateEntryError(error: unknown): boolean {
        return (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: string }).code === "ER_DUP_ENTRY"
        );
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
