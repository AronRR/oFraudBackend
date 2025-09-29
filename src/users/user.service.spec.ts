import { ConflictException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { CreateUserDto } from "./dto/create-user.dto";
import { UserService } from "./user.service";

type MockUserRepository = {
    registerUser: jest.Mock;
    findByEmail: jest.Mock;
    findById: jest.Mock;
    recordBlockedLoginAttempt: jest.Mock;
};

type User = {
    id: number;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    phone_number: string | null;
    password_hash: string;
    password_salt: string;
    role: "user" | "admin";
    is_blocked: number | boolean;
    blocked_reason: string | null;
    blocked_by: number | null;
    blocked_at: Date | null;
    privacy_accepted_at: Date | null;
    community_rules_accepted_at: Date | null;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
};

describe("UserService", () => {
    let userRepository: MockUserRepository;
    let service: UserService;

    const baseUser: User = {
        id: 1,
        email: "user@example.com",
        username: "user123",
        first_name: "User",
        last_name: "Test",
        phone_number: null,
        password_hash: "",
        password_salt: "",
        role: "user",
        is_blocked: 0,
        blocked_reason: null,
        blocked_by: null,
        blocked_at: null,
        privacy_accepted_at: null,
        community_rules_accepted_at: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
    };

    const createUserDto: CreateUserDto = {
        email: "user@example.com",
        username: "user123",
        firstName: "User",
        lastName: "Test",
        phoneNumber: "+34123456789",
        password: "StrongPassword123",
        role: "user",
    };

    beforeEach(() => {
        userRepository = {
            registerUser: jest.fn(),
            findByEmail: jest.fn(),
            findById: jest.fn(),
            recordBlockedLoginAttempt: jest.fn(),
        };
        service = new UserService(userRepository as unknown as any);
    });

    describe("registerUser", () => {
        it("should persist bcrypt salt and hash for new users", async () => {
            userRepository.registerUser.mockImplementation(async (data) => {
                expect(data.password_salt).toHaveLength(29);
                expect(data.password_hash).toHaveLength(60);
                return {
                    ...baseUser,
                    ...data,
                    first_name: data.first_name,
                    last_name: data.last_name,
                    phone_number: data.phone_number ?? null,
                };
            });

            const created = await service.registerUser(createUserDto);

            expect(created.password_salt).toHaveLength(29);
            expect(created.password_hash).toHaveLength(60);
            expect(userRepository.registerUser).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: createUserDto.email,
                    username: createUserDto.username,
                    first_name: createUserDto.firstName,
                    last_name: createUserDto.lastName,
                }),
            );
        });

        it("should translate duplicate entry errors to ConflictException", async () => {
            userRepository.registerUser.mockRejectedValue({ code: "ER_DUP_ENTRY" });

            await expect(service.registerUser(createUserDto)).rejects.toBeInstanceOf(ConflictException);
        });
    });

    describe("login", () => {
        it("should authenticate existing users with bcrypt", async () => {
            const salt = await bcrypt.genSalt();
            const passwordHash = await bcrypt.hash(createUserDto.password, salt);

            userRepository.findByEmail.mockResolvedValue({
                ...baseUser,
                email: createUserDto.email,
                password_hash: passwordHash,
                password_salt: salt,
            });

            await expect(service.login(createUserDto.email, createUserDto.password)).resolves.toMatchObject({
                email: createUserDto.email,
            });
        });

        it("should throw unauthorized when user does not exist", async () => {
            userRepository.findByEmail.mockResolvedValue(null);

            await expect(service.login(createUserDto.email, createUserDto.password)).rejects.toBeInstanceOf(
                UnauthorizedException,
            );
        });

        it("should reject invalid passwords using bcrypt.compare", async () => {
            const salt = await bcrypt.genSalt();
            const passwordHash = await bcrypt.hash("another-password", salt);

            userRepository.findByEmail.mockResolvedValue({
                ...baseUser,
                email: createUserDto.email,
                password_hash: passwordHash,
                password_salt: salt,
            });

            await expect(service.login(createUserDto.email, createUserDto.password)).rejects.toBeInstanceOf(
                UnauthorizedException,
            );
        });

        it("should forbid blocked users and register the attempt when possible", async () => {
            userRepository.recordBlockedLoginAttempt.mockResolvedValue(undefined);

            userRepository.findByEmail.mockResolvedValue({
                ...baseUser,
                is_blocked: 1,
                blocked_reason: "Cuenta bloqueada por fraude",
                blocked_by: 99,
            });

            await expect(service.login(createUserDto.email, createUserDto.password)).rejects.toBeInstanceOf(
                ForbiddenException,
            );

            expect(userRepository.recordBlockedLoginAttempt).toHaveBeenCalledWith(
                baseUser.id,
                99,
                "Cuenta bloqueada por fraude",
            );
        });
    });
});
