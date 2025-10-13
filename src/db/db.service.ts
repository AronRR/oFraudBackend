/* eslint-disable prettier/prettier */

import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool, createPool } from "mysql2/promise";

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
    private pool: Pool;

    constructor(private readonly configService: ConfigService) {}

    onModuleInit(): void {
        const host = this.configService.get<string>("DB_HOST", "localhost");
        const port = Number(this.configService.get<string>("DB_PORT", "3306"));
        const user = this.configService.get<string>("DB_USER", "root");
        const password = this.configService.get<string>("DB_PASSWORD", "");
        const database = this.configService.get<string>("DB_NAME", "ofraud");

        this.pool = createPool({
            host,
            port,
            user,
            password,
            database,
        });
    }

    onModuleDestroy(): void {
        void this.pool.end();
    }

    getPool(): Pool {
        return this.pool;
    }
}

/* CREAR .ENV*/