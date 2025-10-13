/* eslint-disable prettier/prettier */

import { Injectable } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

export interface RefreshTokenRecord {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  revoked_reason: string | null;
  created_at: Date;
  created_by_ip: string | null;
}

type QueryExecutor = Pool | PoolConnection;

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly dbService: DbService) {}

  private getExecutor(conn?: PoolConnection): QueryExecutor {
    return conn ?? this.dbService.getPool();
  }

  async createToken(params: {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
    createdByIp?: string | null;
  }, conn?: PoolConnection): Promise<number> {
    const executor = this.getExecutor(conn);
    const [result] = await executor.query<ResultSetHeader>(
      `INSERT INTO auth_refresh_tokens (user_id, token_hash, expires_at, created_by_ip)
       VALUES (?, ?, ?, ?)`,
      [params.userId, params.tokenHash, params.expiresAt, params.createdByIp ?? null],
    );
    return result.insertId;
  }

  async findByTokenHash(tokenHash: string, conn?: PoolConnection): Promise<RefreshTokenRecord | undefined> {
    const executor = this.getExecutor(conn);
    const [rows] = await executor.query<RowDataPacket[]>(
      `SELECT * FROM auth_refresh_tokens
       WHERE token_hash = ?
       AND revoked_at IS NULL
       AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash],
    );
    return (rows as unknown as RefreshTokenRecord[])[0];
  }

  async revokeToken(tokenHash: string, reason?: string, conn?: PoolConnection): Promise<void> {
    const executor = this.getExecutor(conn);
    await executor.query(
      `UPDATE auth_refresh_tokens
       SET revoked_at = NOW(), revoked_reason = ?
       WHERE token_hash = ? AND revoked_at IS NULL`,
      [reason ?? null, tokenHash],
    );
  }

  async revokeAllUserTokens(userId: number, reason?: string, conn?: PoolConnection): Promise<void> {
    const executor = this.getExecutor(conn);
    await executor.query(
      `UPDATE auth_refresh_tokens
       SET revoked_at = NOW(), revoked_reason = ?
       WHERE user_id = ? AND revoked_at IS NULL`,
      [reason ?? null, userId],
    );
  }

  async deleteExpiredTokens(conn?: PoolConnection): Promise<number> {
    const executor = this.getExecutor(conn);
    const [result] = await executor.query<ResultSetHeader>(
      `DELETE FROM auth_refresh_tokens
       WHERE expires_at < NOW() OR revoked_at IS NOT NULL`,
    );
    return result.affectedRows;
  }
}
