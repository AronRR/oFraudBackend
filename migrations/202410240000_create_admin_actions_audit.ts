/* eslint-disable no-console */
import mysql, { Pool } from "mysql2/promise";

interface DbConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    timezone: "Z";
}

function resolveDbConfig(): DbConfig {
    return {
        host: process.env.DB_HOST ?? "localhost",
        port: Number(process.env.DB_PORT ?? 3306),
        user: process.env.DB_USER ?? "root",
        password: process.env.DB_PASSWORD ?? "",
        database: process.env.DB_NAME ?? "ofraud",
        timezone: "Z",
    };
}

async function ensureAdminActionsAuditTable(pool: Pool): Promise<void> {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS admin_actions_audit (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            admin_id BIGINT UNSIGNED NOT NULL,
            action_type ENUM(
                'login',
                'approve_report',
                'reject_report',
                'delete_report',
                'block_user',
                'unblock_user',
                'promote_user',
                'demote_user',
                'create_category',
                'update_category',
                'resolve_flag',
                'bulk_action'
            ) NOT NULL,
            target_type ENUM('report', 'user', 'category', 'flag', 'multiple') NULL,
            target_id BIGINT UNSIGNED NULL,
            details JSON NULL,
            ip_address VARCHAR(45) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_admin_actions_audit_admin (admin_id),
            KEY idx_admin_actions_audit_action_type (action_type),
            KEY idx_admin_actions_audit_target (target_type, target_id),
            KEY idx_admin_actions_audit_created_at (created_at),
            CONSTRAINT fk_admin_actions_audit_admin FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

async function ensureAdminPromotionsAuditTable(pool: Pool): Promise<void> {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS admin_promotions_audit (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            promoted_by BIGINT UNSIGNED NOT NULL,
            from_role ENUM('user', 'admin', 'superadmin') NOT NULL,
            to_role ENUM('user', 'admin', 'superadmin') NOT NULL,
            reason TEXT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_admin_promotions_audit_user (user_id),
            KEY idx_admin_promotions_audit_promoted_by (promoted_by),
            KEY idx_admin_promotions_audit_created_at (created_at),
            CONSTRAINT fk_admin_promotions_audit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            CONSTRAINT fk_admin_promotions_audit_promoted_by FOREIGN KEY (promoted_by) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

async function updateUsersRoleEnum(pool: Pool): Promise<void> {
    // Modify the role column to include superadmin
    await pool.execute(`
        ALTER TABLE users
        MODIFY COLUMN role ENUM('user', 'admin', 'superadmin') NOT NULL DEFAULT 'user'
    `);
}

async function main(): Promise<void> {
    const pool = mysql.createPool(resolveDbConfig());
    try {
        await ensureAdminActionsAuditTable(pool);
        console.info("✓ Created admin_actions_audit table");

        await ensureAdminPromotionsAuditTable(pool);
        console.info("✓ Created admin_promotions_audit table");

        await updateUsersRoleEnum(pool);
        console.info("✓ Updated users table role enum to include superadmin");

        console.info("\n✅ Migration completed successfully");
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error("❌ Failed to run migration", error);
    process.exitCode = 1;
});
