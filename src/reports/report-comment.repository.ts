/* eslint-disable prettier/prettier */

import { Injectable } from '@nestjs/common';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DbService } from 'src/db/db.service';

export type ReportCommentStatus = 'visible' | 'hidden' | 'deleted';

export interface ReportCommentRecord {
  id: number;
  report_id: number;
  user_id: number;
  parent_comment_id: number | null;
  content: string;
  status: ReportCommentStatus;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

type QueryExecutor = Pool | PoolConnection;

@Injectable()
export class ReportCommentRepository {
  constructor(private readonly dbService: DbService) {}

  private getExecutor(conn?: PoolConnection): QueryExecutor {
    return conn ?? this.dbService.getPool();
  }

  async findById(commentId: number, conn?: PoolConnection): Promise<ReportCommentRecord | undefined> {
    const executor = this.getExecutor(conn);
    const [rows] = await executor.query<RowDataPacket[]>(
      'SELECT * FROM report_comments WHERE id = ? LIMIT 1',
      [commentId],
    );
    return (rows as unknown as ReportCommentRecord[])[0];
  }

  async insertComment(
    conn: PoolConnection,
    payload: {
      reportId: number;
      userId: number;
      parentCommentId: number | null;
      content: string;
    },
  ): Promise<number> {
    const [result] = await conn.query<ResultSetHeader>(
      'INSERT INTO report_comments (report_id, user_id, parent_comment_id, content) VALUES (?, ?, ?, ?)',
      [payload.reportId, payload.userId, payload.parentCommentId, payload.content],
    );
    return result.insertId;
  }

  async updateComment(conn: PoolConnection, commentId: number, content: string): Promise<void> {
    await conn.query('UPDATE report_comments SET content = ?, updated_at = NOW() WHERE id = ?', [content, commentId]);
  }

  async softDeleteComment(conn: PoolConnection, commentId: number): Promise<void> {
    await conn.query(
      "UPDATE report_comments SET status = 'deleted', deleted_at = NOW(), updated_at = NOW() WHERE id = ?",
      [commentId],
    );
  }

  async listVisibleComments(
    reportId: number,
    params: { limit: number; offset: number },
  ): Promise<{ items: ReportCommentRecord[]; total: number }> {
    const executor = this.dbService.getPool();
    const [rows] = await executor.query<RowDataPacket[]>(
      `SELECT *
       FROM report_comments
       WHERE report_id = ? AND status = 'visible' AND deleted_at IS NULL
       ORDER BY created_at ASC
       LIMIT ? OFFSET ?`,
      [reportId, params.limit, params.offset],
    );

    const [countRows] = await executor.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM report_comments
       WHERE report_id = ? AND status = 'visible' AND deleted_at IS NULL`,
      [reportId],
    );

    const total = Number((countRows as unknown as Array<{ total: number }>)[0]?.total ?? 0);
    return {
      items: rows as unknown as ReportCommentRecord[],
      total,
    };
  }
}
