/* eslint-disable prettier/prettier */

import { Injectable } from "@nestjs/common";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { DbService } from "src/db/db.service";

export type UserRole = "user" | "admin" | "moderator";

export type User = {
    id: number;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    phone_number: string | null;
    password_hash: string;
    password_salt: string;
    role: UserRole;
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

export type CreateUserRecord = {
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    phone_number?: string | null;
    password_hash: string;
    password_salt: string;
    role?: UserRole;
};

@Injectable()
export class UserRepository {
    constructor(private readonly dbService: DbService) {}

    async registerUser(data: CreateUserRecord): Promise<User> {
        const insertSql =
            "INSERT INTO users (email, username, first_name, last_name, phone_number, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        const pool = this.dbService.getPool();
        const [result] = await pool.execute<ResultSetHeader>(insertSql, [
            data.email,
            data.username,
            data.first_name,
            data.last_name,
            data.phone_number ?? null,
            data.password_hash,
            data.password_salt,
            data.role ?? "user",
        ]);

        const createdUser = await this.findById(result.insertId);
        if (!createdUser) {
            throw new Error("Failed to retrieve created user");
        }

        return createdUser;
    }

    async findByEmail(email: string): Promise<User | null> {
        const sql = "SELECT * FROM users WHERE email = ? LIMIT 1";
        const [rows] = await this.dbService
            .getPool()
            .execute<RowDataPacket[]>(sql, [email]);
        const users = rows as unknown as User[];
        return users.length > 0 ? users[0] : null;
    }

    async findById(id: number): Promise<User | null> {
        const sql = "SELECT * FROM users WHERE id = ? LIMIT 1";
        const [rows] = await this.dbService
            .getPool()
            .execute<RowDataPacket[]>(sql, [id]);
        const users = rows as unknown as User[];
        return users.length > 0 ? users[0] : null;
    }
}
