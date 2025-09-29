/* eslint-disable prettier/prettier */

import { Injectable } from '@nestjs/common';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DbService } from 'src/db/db.service';

export interface ReportRatingRecord {
  id: number;
  report_id: number;
  user_id: number;
  score: number;
  comment: string | null;
  created_at: Date;
  updated_at: Date;
}

type QueryExecutor = Pool | PoolConnection;

@Injectable()
export class ReportRatingRepository {
  constructor(private readonly dbService: DbService) {}

  private getExecutor(conn?: PoolConnection): QueryExecutor {
    return conn ?? this.dbService.getPool();
  }

  async findByReportAndUser(
    reportId: number,
    userId: number,
    conn?: PoolConnection,
  ): Promise<ReportRatingRecord | undefined> {
    const executor = this.getExecutor(conn);
    const [rows] = await executor.query<RowDataPacket[]>(
      'SELECT * FROM report_ratings WHERE report_id = ? AND user_id = ? LIMIT 1',
      [reportId, userId],
    );
    return (rows as unknown as ReportRatingRecord[])[0];
  }

  async findById(ratingId: number, conn?: PoolConnection): Promise<ReportRatingRecord | undefined> {
    const executor = this.getExecutor(conn);
    const [rows] = await executor.query<RowDataPacket[]>(
      'SELECT * FROM report_ratings WHERE id = ? LIMIT 1',
      [ratingId],
    );
    return (rows as unknown as ReportRatingRecord[])[0];
  }

  async insertRating(
    conn: PoolConnection,
    payload: { reportId: number; userId: number; score: number; comment: string | null },
  ): Promise<number> {
    const [result] = await conn.query<ResultSetHeader>(
      'INSERT INTO report_ratings (report_id, user_id, score, comment) VALUES (?, ?, ?, ?)',
      [payload.reportId, payload.userId, payload.score, payload.comment],
    );
    return result.insertId;
  }

  async updateRating(
    conn: PoolConnection,
    ratingId: number,
    payload: { score?: number; comment?: string | null },
  ): Promise<void> {
    const fields: string[] = [];
    const values: Array<number | string | null> = [];

    if (payload.score != null) {
      fields.push('score = ?');
      values.push(payload.score);
    }

    if (payload.comment !== undefined) {
      fields.push('comment = ?');
      values.push(payload.comment);
    }

    if (!fields.length) {
      return;
    }

    values.push(ratingId);
    await conn.query(`UPDATE report_ratings SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
  }

  async deleteRating(conn: PoolConnection, ratingId: number): Promise<void> {
    await conn.query('DELETE FROM report_ratings WHERE id = ?', [ratingId]);
  }
}
