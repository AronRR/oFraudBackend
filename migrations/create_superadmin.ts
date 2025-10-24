/* eslint-disable no-console */
import mysql, { Pool } from "mysql2/promise";
import * as bcrypt from "bcrypt";

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

async function createSuperAdmin(pool: Pool): Promise<void> {
    // Generar hash del password
    const password = "SuperAdmin2025!";
    const passwordHash = await bcrypt.hash(password, 10);

    // Verificar si ya existe
    const [existing] = await pool.execute(
        "SELECT id FROM users WHERE email = ?",
        ["superadmin@ofraud.com"]
    );

    if ((existing as any[]).length > 0) {
        // Actualizar a superadmin si ya existe
        await pool.execute(
            "UPDATE users SET role = 'superadmin' WHERE email = ?",
            ["superadmin@ofraud.com"]
        );
        console.info("✅ Usuario existente actualizado a superadmin");
    } else {
        // Crear nuevo superadmin
        await pool.execute(`
            INSERT INTO users (email, username, first_name, last_name, password_hash, password_salt, role)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            "superadmin@ofraud.com",
            "superadmin",
            "Super",
            "Admin",
            passwordHash,
            "",
            "superadmin"
        ]);
        console.info("✅ Superadmin creado exitosamente");
    }

    console.info("\n📧 Email: superadmin@ofraud.com");
    console.info("🔑 Password: SuperAdmin2025!");
    console.info("\n⚠️  IMPORTANTE: Cambia este password después del primer login");
}

async function main(): Promise<void> {
    const pool = mysql.createPool(resolveDbConfig());
    try {
        await createSuperAdmin(pool);
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error("❌ Failed to create superadmin", error);
    process.exitCode = 1;
});
