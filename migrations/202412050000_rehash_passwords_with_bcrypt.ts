/* eslint-disable no-console */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as bcrypt from "bcrypt";
import { createHash } from "crypto";
import mysql from "mysql2/promise";

type LegacyPasswordDump = Record<string, string>;

type UserRow = {
    id: number;
    email: string;
    password_hash: string;
    password_salt: string;
};

async function loadLegacyPasswords(): Promise<LegacyPasswordDump> {
    const dumpPath = process.env.LEGACY_PASSWORDS_PATH;
    if (!dumpPath) {
        throw new Error(
            "Missing LEGACY_PASSWORDS_PATH environment variable. Provide a JSON file mapping user emails to their plaintext passwords.",
        );
    }

    const fileContents = await fs.readFile(path.resolve(dumpPath), "utf8");
    return JSON.parse(fileContents) as LegacyPasswordDump;
}

async function main(): Promise<void> {
    const dbConfig = {
        host: process.env.DB_HOST ?? "localhost",
        port: Number(process.env.DB_PORT ?? 3306),
        user: process.env.DB_USER ?? "root",
        password: process.env.DB_PASSWORD ?? "",
        database: process.env.DB_NAME ?? "ofraud",
        timezone: "Z" as const,
    };

    const pool = mysql.createPool(dbConfig);
    const legacyPasswords = await loadLegacyPasswords();

    const [rows] = await pool.query<UserRow[]>(
        "SELECT id, email, password_hash, password_salt FROM users WHERE CHAR_LENGTH(password_hash) <> 60",
    );

    let updated = 0;

    for (const row of rows) {
        const plaintext = legacyPasswords[row.email];
        if (!plaintext) {
            console.warn(`Skipping ${row.email} because no plaintext password was provided.`);
            continue;
        }

        const legacyHash = createHash("sha256").update(`${plaintext}${row.password_salt}`, "utf8").digest("hex");
        if (legacyHash !== row.password_hash) {
            console.warn(`Skipping ${row.email} because provided password does not match stored legacy hash.`);
            continue;
        }

        const salt = await bcrypt.genSalt();
        const hash = await bcrypt.hash(plaintext, salt);
        await pool.execute("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?", [hash, salt, row.id]);
        updated += 1;
        console.info(`Updated password hash for ${row.email}`);
    }

    await pool.end();
    console.info(`Rehashed ${updated} legacy password(s) using bcrypt.`);
}

main().catch((error) => {
    console.error("Failed to rehash legacy passwords", error);
    process.exitCode = 1;
});
