import { Injectable, Logger } from "@nestjs/common";
import { DbService } from "src/db/db.service";

export type UserSecurityAuditAction = "password_changed";

@Injectable()
export class UserSecurityAuditRepository {
    private readonly logger = new Logger(UserSecurityAuditRepository.name);

    constructor(private readonly dbService: DbService) {}

    async recordAction(
        userId: number,
        action: UserSecurityAuditAction,
        metadata?: Record<string, unknown> | null,
    ): Promise<void> {
        const sql =
            "INSERT INTO user_security_audit (user_id, action, metadata) VALUES (?, ?, ?)";
        const pool = this.dbService.getPool();
        const metadataValue = metadata ? JSON.stringify(metadata) : null;

        try {
            await pool.execute(sql, [userId, action, metadataValue]);
        } catch (error) {
            const message = error instanceof Error ? error.message : "unknown error";
            this.logger.warn(
                `Failed to record security audit action ${action} for user ${userId}: ${message}`,
            );
        }
    }

    async recordPasswordChange(userId: number): Promise<void> {
        await this.recordAction(userId, "password_changed");
    }
}
