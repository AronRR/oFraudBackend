import { Injectable, Logger } from "@nestjs/common";
import { DbService } from "src/db/db.service";

export interface UserProfileAuditChange {
    field: string;
    oldValue: string | null;
    newValue: string | null;
}

@Injectable()
export class UserProfileAuditRepository {
    private readonly logger = new Logger(UserProfileAuditRepository.name);

    constructor(private readonly dbService: DbService) {}

    async recordChanges(userId: number, changes: UserProfileAuditChange[]): Promise<void> {
        if (changes.length === 0) {
            return;
        }

        const sql =
            "INSERT INTO user_profile_audit (user_id, field, old_value, new_value) VALUES (?, ?, ?, ?)";
        const pool = this.dbService.getPool();

        for (const change of changes) {
            try {
                await pool.execute(sql, [userId, change.field, change.oldValue, change.newValue]);
            } catch (error) {
                const message = error instanceof Error ? error.message : "unknown error";
                this.logger.warn(`Failed to record profile change for user ${userId} on field ${change.field}: ${message}`);
            }
        }
    }
}
