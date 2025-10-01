/* eslint-disable no-console */
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

interface DbConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    timezone: "Z";
}

const TABLE_OPTIONS = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

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

async function executeStatements(pool: Pool, statements: string[]): Promise<void> {
    for (const statement of statements) {
        const compact = statement.replace(/\s+/g, " ").trim();
        console.info(`Executing: ${compact.slice(0, 120)}${compact.length > 120 ? "..." : ""}`);
        await pool.query(statement);
    }
}

async function addForeignKeyIfMissing(
    pool: Pool,
    tableName: string,
    constraintName: string,
    definitionSql: string,
): Promise<void> {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
        [tableName, constraintName],
    );

    if (rows.length === 0) {
        await pool.query(`ALTER TABLE \`${tableName}\` ADD CONSTRAINT \`${constraintName}\` ${definitionSql}`);
    }
}

async function dropForeignKeyIfExists(pool: Pool, tableName: string, constraintName: string): Promise<void> {
    const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
        [tableName, constraintName],
    );

    if (rows.length > 0) {
        await pool.query(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${constraintName}\``);
    }
}

export async function up(pool: Pool): Promise<void> {
    await executeStatements(pool, [
        `CREATE TABLE IF NOT EXISTS users (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            email VARCHAR(255) NOT NULL,
            username VARCHAR(50) NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            phone_number VARCHAR(20) NULL,
            password_hash CHAR(60) NOT NULL,
            password_salt CHAR(29) NOT NULL,
            role ENUM('user','admin') NOT NULL DEFAULT 'user',
            is_blocked TINYINT(1) NOT NULL DEFAULT 0,
            blocked_reason VARCHAR(255) NULL,
            blocked_by BIGINT UNSIGNED NULL,
            blocked_at DATETIME NULL,
            privacy_accepted_at DATETIME NULL,
            community_rules_accepted_at DATETIME NULL,
            last_login_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted_at DATETIME NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_users_email (email),
            UNIQUE KEY uniq_users_username (username),
            KEY idx_users_blocked_role (is_blocked, role),
            KEY idx_users_last_login (last_login_at),
            CONSTRAINT fk_users_blocked_by FOREIGN KEY (blocked_by) REFERENCES users (id)
                ON DELETE SET NULL ON UPDATE CASCADE
        ) ${TABLE_OPTIONS}`,
        `CREATE TABLE IF NOT EXISTS user_block_events (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            action ENUM('blocked','unblocked') NOT NULL,
            reason VARCHAR(255) NULL,
            blocked_by_user_id BIGINT UNSIGNED NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_user_block_events_user_id (user_id),
            KEY idx_user_block_events_actor (blocked_by_user_id),
            CONSTRAINT fk_block_events_user FOREIGN KEY (user_id) REFERENCES users (id)
                ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_block_events_actor FOREIGN KEY (blocked_by_user_id) REFERENCES users (id)
                ON DELETE RESTRICT ON UPDATE CASCADE
        ) ${TABLE_OPTIONS}`,
        `CREATE TABLE IF NOT EXISTS user_profile_audit (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            field VARCHAR(64) NOT NULL,
            old_value VARCHAR(255) NULL,
            new_value VARCHAR(255) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_user_profile_audit_user_created (user_id, created_at),
            KEY idx_user_profile_audit_field_created (field, created_at),
            CONSTRAINT fk_user_profile_audit_user FOREIGN KEY (user_id) REFERENCES users (id)
                ON DELETE CASCADE ON UPDATE CASCADE
        ) ${TABLE_OPTIONS}`,
        `CREATE TABLE IF NOT EXISTS user_security_audit (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            action VARCHAR(50) NOT NULL,
            metadata JSON NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_user_security_audit_user_action_created (user_id, action, created_at),
            CONSTRAINT fk_user_security_audit_user FOREIGN KEY (user_id) REFERENCES users (id)
                ON DELETE CASCADE ON UPDATE CASCADE
        ) ${TABLE_OPTIONS}`,
        `CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            token_hash CHAR(128) NOT NULL,
            expires_at DATETIME NOT NULL,
            revoked_at DATETIME NULL,
            revoked_reason VARCHAR(255) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by_ip VARCHAR(45) NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_auth_refresh_tokens_hash (token_hash),
            KEY idx_refresh_tokens_user_expires (user_id, expires_at),
            CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id)
                ON DELETE CASCADE ON UPDATE CASCADE
        ) ${TABLE_OPTIONS}`,
        `CREATE TABLE IF NOT EXISTS user_password_resets (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            token_hash CHAR(128) NOT NULL,
            expires_at DATETIME NOT NULL,
            used_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_user_password_resets_hash (token_hash),
            KEY idx_user_password_resets_user (user_id),
            CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users (id)
                ON DELETE CASCADE ON UPDATE CASCADE
        ) ${TABLE_OPTIONS}`,
        `CREATE TABLE IF NOT EXISTS categories (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(120) NOT NULL,
            slug VARCHAR(140) NOT NULL,
            description TEXT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            reports_count INT NOT NULL DEFAULT 0,
            search_count INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_categories_name (name),
            UNIQUE KEY uniq_categories_slug (slug)
        ) ${TABLE_OPTIONS}`,
        `CREATE TABLE IF NOT EXISTS report_rejection_reasons (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            code VARCHAR(50) NOT NULL,
            label VARCHAR(120) NOT NULL,
            description VARCHAR(255) NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_report_rejection_reasons_code (code)
        ) ${TABLE_OPTIONS}`,
        `CREATE TABLE IF NOT EXISTS reports (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            author_id BIGINT UNSIGNED NOT NULL,
            category_id BIGINT UNSIGNED NOT NULL,
            current_revision_id BIGINT UNSIGNED NULL,
            status ENUM('pending','approved','rejected','removed') NOT NULL DEFAULT 'pending',
            reviewed_by BIGINT UNSIGNED NULL,
            reviewed_at DATETIME NULL,
            approved_at DATETIME NULL,
            review_notes TEXT NULL,
            rejection_reason_id BIGINT UNSIGNED NULL,
            rejection_reason_text VARCHAR(255) NULL,
            is_locked TINYINT(1) NOT NULL DEFAULT 0,
            is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
            rating_average DECIMAL(3,2) NOT NULL DEFAULT 0.00,
            rating_count INT NOT NULL DEFAULT 0,
            published_at DATETIME NULL,
            deleted_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_reports_status_created_at (status, created_at),
            KEY idx_reports_category_status_created_at (category_id, status, created_at),
            KEY idx_reports_author (author_id),
            CONSTRAINT fk_reports_author FOREIGN KEY (author_id) REFERENCES users (id)
                ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT fk_reports_category FOREIGN KEY (category_id) REFERENCES categories (id)
                ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT fk_reports_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users (id)
                ON DELETE SET NULL ON UPDATE CASCADE,
            CONSTRAINT fk_reports_rejection_reason FOREIGN KEY (rejection_reason_id) REFERENCES report_rejection_reasons (id)
                ON DELETE SET NULL ON UPDATE CASCADE
        ) ${TABLE_OPTIONS}`,
        `CREATE TABLE IF NOT EXISTS report_revisions (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            report_id BIGINT UNSIGNED NOT NULL,
            version_number INT NOT NULL,
            title VARCHAR(180) NULL,
            description TEXT NOT NULL,
            incident_url VARCHAR(1024) NOT NULL,
            publisher_host VARCHAR(255) NOT NULL,
            is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
            created_by_user_id BIGINT UNSIGNED NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_report_revisions_report_version (report_id, version_number),
            KEY idx_report_revisions_publisher_host (publisher_host),
            CONSTRAINT fk_report_revisions_report FOREIGN KEY (report_id) REFERENCES reports (id)
                ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_report_revisions_author FOREIGN KEY (created_by_user_id) REFERENCES users (id)
                ON DELETE RESTRICT ON UPDATE CASCADE
        ) ${TABLE_OPTIONS}`,
        `CREATE TABLE IF NOT EXISTS report_media (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            revision_id BIGINT UNSIGNED NOT NULL,
            file_url VARCHAR(1024) NOT NULL,
            storage_key VARCHAR(255) NULL,
            media_type ENUM('image','video','file') NOT NULL DEFAULT 'image',
            position TINYINT UNSIGNED NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME NULL,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_report_media_revision_position (revision_id, position),
            CONSTRAINT fk_report_media_revision FOREIGN KEY (revision_id) REFERENCES report_revisions (id)
                ON DELETE CASCADE ON UPDATE CASCADE
        ) ${TABLE_OPTIONS}`,
        `CREATE TABLE IF NOT EXISTS report_status_history (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            report_id BIGINT UNSIGNED NOT NULL,
            from_status ENUM('pending','approved','rejected','removed') NULL,
            to_status ENUM('pending','approved','rejected','removed') NOT NULL,
            rejection_reason_id BIGINT UNSIGNED NULL,
            rejection_reason_code VARCHAR(50) NULL,
            rejection_reason_text VARCHAR(255) NULL,
            note VARCHAR(255) NULL,
            changed_by_user_id BIGINT UNSIGNED NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_report_status_history_report_created (report_id, created_at),
            CONSTRAINT fk_report_status_history_report FOREIGN KEY (report_id) REFERENCES reports (id)
                ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_report_status_history_reason FOREIGN KEY (rejection_reason_id) REFERENCES report_rejection_reasons (id)
                ON DELETE SET NULL ON UPDATE CASCADE,
            CONSTRAINT fk_report_status_history_actor FOREIGN KEY (changed_by_user_id) REFERENCES users (id)
                ON DELETE RESTRICT ON UPDATE CASCADE
        ) ${TABLE_OPTIONS}`,
        `CREATE TABLE IF NOT EXISTS report_ratings (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            report_id BIGINT UNSIGNED NOT NULL,
            user_id BIGINT UNSIGNED NOT NULL,
            score TINYINT UNSIGNED NOT NULL,
            comment VARCHAR(500) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_report_ratings_report_user (report_id, user_id),
            CONSTRAINT fk_report_ratings_report FOREIGN KEY (report_id) REFERENCES reports (id)
                ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_report_ratings_user FOREIGN KEY (user_id) REFERENCES users (id)
                ON DELETE CASCADE ON UPDATE CASCADE
        ) ${TABLE_OPTIONS}`,
        `CREATE TABLE IF NOT EXISTS report_comments (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            report_id BIGINT UNSIGNED NOT NULL,
            user_id BIGINT UNSIGNED NOT NULL,
            parent_comment_id BIGINT UNSIGNED NULL,
            content TEXT NOT NULL,
            status ENUM('visible','hidden','deleted') NOT NULL DEFAULT 'visible',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted_at DATETIME NULL,
            PRIMARY KEY (id),
            KEY idx_report_comments_report_created (report_id, created_at),
            CONSTRAINT fk_report_comments_report FOREIGN KEY (report_id) REFERENCES reports (id)
                ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_report_comments_user FOREIGN KEY (user_id) REFERENCES users (id)
                ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_report_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES report_comments (id)
                ON DELETE SET NULL ON UPDATE CASCADE
        ) ${TABLE_OPTIONS}`,
        `CREATE TABLE IF NOT EXISTS report_flags (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            report_id BIGINT UNSIGNED NOT NULL,
            reported_by_user_id BIGINT UNSIGNED NOT NULL,
            reason_code ENUM('spam','abuse','copyright','other') NOT NULL,
            details TEXT NULL,
            status ENUM('pending','validated','dismissed') NOT NULL DEFAULT 'pending',
            handled_by_user_id BIGINT UNSIGNED NULL,
            handled_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uniq_report_flags_report_user_reason (report_id, reported_by_user_id, reason_code),
            KEY idx_report_flags_report (report_id),
            CONSTRAINT fk_report_flags_report FOREIGN KEY (report_id) REFERENCES reports (id)
                ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_report_flags_reporter FOREIGN KEY (reported_by_user_id) REFERENCES users (id)
                ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_report_flags_handler FOREIGN KEY (handled_by_user_id) REFERENCES users (id)
                ON DELETE SET NULL ON UPDATE CASCADE
        ) ${TABLE_OPTIONS}`,
        `CREATE TABLE IF NOT EXISTS category_search_logs (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            category_id BIGINT UNSIGNED NOT NULL,
            user_id BIGINT UNSIGNED NULL,
            query VARCHAR(255) NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_category_search_logs_category (category_id),
            KEY idx_category_search_logs_user (user_id),
            CONSTRAINT fk_category_search_logs_category FOREIGN KEY (category_id) REFERENCES categories (id)
                ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT fk_category_search_logs_user FOREIGN KEY (user_id) REFERENCES users (id)
                ON DELETE SET NULL ON UPDATE CASCADE
        ) ${TABLE_OPTIONS}`,
    ]);

    await addForeignKeyIfMissing(
        pool,
        "reports",
        "fk_reports_current_revision",
        "FOREIGN KEY (current_revision_id) REFERENCES report_revisions (id) ON DELETE SET NULL ON UPDATE CASCADE",
    );
}

export async function down(pool: Pool): Promise<void> {
    await dropForeignKeyIfExists(pool, "reports", "fk_reports_current_revision");

    await executeStatements(pool, [
        "DROP TABLE IF EXISTS category_search_logs",
        "DROP TABLE IF EXISTS report_flags",
        "DROP TABLE IF EXISTS report_comments",
        "DROP TABLE IF EXISTS report_ratings",
        "DROP TABLE IF EXISTS report_status_history",
        "DROP TABLE IF EXISTS report_media",
        "DROP TABLE IF EXISTS report_revisions",
        "DROP TABLE IF EXISTS reports",
        "DROP TABLE IF EXISTS report_rejection_reasons",
        "DROP TABLE IF EXISTS categories",
        "DROP TABLE IF EXISTS user_password_resets",
        "DROP TABLE IF EXISTS auth_refresh_tokens",
        "DROP TABLE IF EXISTS user_security_audit",
        "DROP TABLE IF EXISTS user_profile_audit",
        "DROP TABLE IF EXISTS user_block_events",
        "DROP TABLE IF EXISTS users"
    ]);
}

async function main(): Promise<void> {
    const direction = (process.argv[2] ?? "up").toLowerCase();
    const pool = mysql.createPool(resolveDbConfig());

    try {
        if (direction === "down") {
            await down(pool);
            console.info("Rolled back initial schema successfully.");
        } else if (direction === "up") {
            await up(pool);
            console.info("Applied initial schema successfully.");
        } else {
            throw new Error(`Unknown migration direction: ${direction}`);
        }
    } finally {
        await pool.end();
    }
}

if (process.argv[1]?.includes("202412010000_init_schema")) {
    main().catch((error) => {
        console.error("Failed to run initial schema migration", error);
        process.exitCode = 1;
    });
}

