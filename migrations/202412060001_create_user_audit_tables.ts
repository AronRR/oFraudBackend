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

async function ensureUserProfileAuditTable(pool: Pool): Promise<void> {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS user_profile_audit (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            field VARCHAR(64) NOT NULL,
            old_value VARCHAR(255) NULL,
            new_value VARCHAR(255) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_user_profile_audit_user (user_id),
            KEY idx_user_profile_audit_field (field),
            CONSTRAINT fk_user_profile_audit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

async function ensureUserSecurityAuditTable(pool: Pool): Promise<void> {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS user_security_audit (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            action VARCHAR(50) NOT NULL,
            metadata JSON NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_user_security_audit_user_action (user_id, action),
            CONSTRAINT fk_user_security_audit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

async function main(): Promise<void> {
    const pool = mysql.createPool(resolveDbConfig());
    try {
        await ensureUserProfileAuditTable(pool);
        console.info("Ensured user_profile_audit table exists");
        await ensureUserSecurityAuditTable(pool);
        console.info("Ensured user_security_audit table exists");
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error("Failed to create audit tables", error);
    process.exitCode = 1;
});
