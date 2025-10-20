import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { TokenService } from "./tokens.service";
import { UserService } from "src/users/user.service";

describe("AuthController", () => {
    let controller: AuthController;
    let tokenService: jest.Mocked<TokenService>;
    let userService: jest.Mocked<UserService>;

    beforeEach(() => {
        tokenService = {
            generateAccess: jest.fn(),
            generateRefresh: jest.fn(),
            verifyAccess: jest.fn(),
            verifyRefresh: jest.fn(),
        } as unknown as jest.Mocked<TokenService>;

        userService = {
            login: jest.fn(),
            findById: jest.fn(),
            registerUser: jest.fn(),
        } as unknown as jest.Mocked<UserService>;

        controller = new AuthController(tokenService, userService);
    });

    describe("login", () => {
        it("should return tokens and a friendly message", async () => {
            userService.login.mockResolvedValue({
                id: 1,
                email: "user@example.com",
                username: "user123",
                first_name: "User",
                last_name: "Example",
                phone_number: null,
                password_hash: "hash",
                password_salt: "salt",
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
            });
            tokenService.generateAccess.mockResolvedValue("access-token");
            tokenService.generateRefresh.mockResolvedValue("refresh-token");

            const mockReq = {
                ip: "127.0.0.1",
                socket: {
                    remoteAddress: "127.0.0.1"
                }
            };

            const response = await controller.login({ email: "user@example.com", password: "Passw0rd" }, mockReq);

            expect(response).toEqual({
                message: "Inicio de sesión exitoso",
                accessToken: "access-token",
                refreshToken: "refresh-token",
            });
            expect(tokenService.generateAccess).toHaveBeenCalledTimes(1);
            expect(tokenService.generateRefresh).toHaveBeenCalledWith("1", "127.0.0.1");
        });

        it("should not issue tokens when the user is blocked", async () => {
            userService.login.mockRejectedValue(new ForbiddenException("Cuenta bloqueada"));

            const mockReq = {
                ip: "127.0.0.1",
                socket: {
                    remoteAddress: "127.0.0.1"
                }
            };

            await expect(controller.login({ email: "user@example.com", password: "Passw0rd" }, mockReq)).rejects.toBeInstanceOf(
                ForbiddenException,
            );

            expect(tokenService.generateAccess).not.toHaveBeenCalled();
            expect(tokenService.generateRefresh).not.toHaveBeenCalled();
        });

        it("should return unauthorized when the email does not exist", async () => {
            userService.login.mockRejectedValue(new UnauthorizedException("Usuario no encontrado"));

            const mockReq = {
                ip: "127.0.0.1",
                socket: {
                    remoteAddress: "127.0.0.1"
                }
            };

            await expect(controller.login({ email: "missing@example.com", password: "Passw0rd" }, mockReq)).rejects.toBeInstanceOf(
                UnauthorizedException,
            );

            expect(tokenService.generateAccess).not.toHaveBeenCalled();
            expect(tokenService.generateRefresh).not.toHaveBeenCalled();
        });
    });
});
