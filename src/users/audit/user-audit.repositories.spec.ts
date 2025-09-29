import { Logger } from "@nestjs/common";
import { UserProfileAuditRepository, UserProfileAuditChange } from "./user-profile-audit.repository";
import { UserSecurityAuditRepository } from "./user-security-audit.repository";

describe("UserProfileAuditRepository", () => {
    let executeMock: jest.Mock;
    let repository: UserProfileAuditRepository;
    let loggerSpy: jest.SpyInstance;

    beforeEach(() => {
        executeMock = jest.fn().mockResolvedValue(undefined);
        const dbService = { getPool: () => ({ execute: executeMock }) } as unknown as any;
        repository = new UserProfileAuditRepository(dbService);
        loggerSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    });

    afterEach(() => {
        loggerSpy.mockRestore();
    });

    it("persists every change sequentially", async () => {
        const changes: UserProfileAuditChange[] = [
            { field: "first_name", oldValue: "Alice", newValue: "Alicia" },
            { field: "phone_number", oldValue: "111", newValue: "222" },
        ];

        await repository.recordChanges(42, changes);

        expect(executeMock).toHaveBeenCalledTimes(2);
        expect(executeMock).toHaveBeenNthCalledWith(
            1,
            "INSERT INTO user_profile_audit (user_id, field, old_value, new_value) VALUES (?, ?, ?, ?)",
            [42, "first_name", "Alice", "Alicia"],
        );
        expect(executeMock).toHaveBeenNthCalledWith(
            2,
            "INSERT INTO user_profile_audit (user_id, field, old_value, new_value) VALUES (?, ?, ?, ?)",
            [42, "phone_number", "111", "222"],
        );
    });

    it("logs and swallows failures without aborting remaining changes", async () => {
        executeMock.mockRejectedValueOnce(new Error("deadlock"));
        executeMock.mockResolvedValueOnce(undefined);

        await repository.recordChanges(5, [
            { field: "first_name", oldValue: "Ana", newValue: "Ann" },
            { field: "last_name", oldValue: "Smith", newValue: "Smyth" },
        ]);

        expect(loggerSpy).toHaveBeenCalledTimes(1);
        expect(executeMock).toHaveBeenCalledTimes(2);
    });
});

describe("UserSecurityAuditRepository", () => {
    let executeMock: jest.Mock;
    let repository: UserSecurityAuditRepository;
    let loggerSpy: jest.SpyInstance;

    beforeEach(() => {
        executeMock = jest.fn().mockResolvedValue(undefined);
        const dbService = { getPool: () => ({ execute: executeMock }) } as unknown as any;
        repository = new UserSecurityAuditRepository(dbService);
        loggerSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    });

    afterEach(() => {
        loggerSpy.mockRestore();
    });

    it("stores password change events with null metadata", async () => {
        await repository.recordPasswordChange(101);

        expect(executeMock).toHaveBeenCalledWith(
            "INSERT INTO user_security_audit (user_id, action, metadata) VALUES (?, ?, ?)",
            [101, "password_changed", null],
        );
    });

    it("records arbitrary metadata and surfaces warnings when inserts fail", async () => {
        executeMock.mockRejectedValueOnce(new Error("write timeout"));

        await repository.recordAction(7, "password_changed", { source: "admin" });

        expect(loggerSpy).toHaveBeenCalledTimes(1);
    });
});
