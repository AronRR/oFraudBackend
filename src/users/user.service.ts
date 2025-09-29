/* eslint-disable prettier/prettier */

import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { sha256 } from "src/util/crypto/hash.util";
import { CreateUserDto } from "./dto/create-user.dto";
import { User, UserRepository } from "./user.repository";

@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) {}

    async registerUser(createUserDto: CreateUserDto): Promise<User> {
        const salt = randomBytes(16).toString("hex");
        const hashedPassword = sha256(`${createUserDto.password}${salt}`);

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
        if (user.password_hash !== sha256(`${password}${user.password_salt}`)) {
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
}
