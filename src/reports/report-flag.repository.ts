/* eslint-disable prettier/prettier */

import { Injectable } from '@nestjs/common';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DbService } from 'src/db/db.service';
import type { ReportStatus } from './report.repository';

export const REPORT_FLAG_REASONS = ['spam', 'abuse', 'copyright', 'other'] as const;
export type ReportFlagReason = (typeof REPORT_FLAG_REASONS)[number];

export const REPORT_FLAG_STATUSES = ['pending', 'validated', 'dismissed'] as const;
export type ReportFlagStatus = (typeof REPORT_FLAG_STATUSES)[number];

export interface ReportFlagRecord {
  id: number;
  report_id: number;
  reported_by_user_id: number;
  reason_code: ReportFlagReason;
  details: string | null;
  status: ReportFlagStatus;
  handled_by_user_id: number | null;
  handled_at: Date | null;
  created_at: Date;
}

export interface ReportFlagAdminRow {
  flagId: number;
  reportId: number;
  reportStatus: ReportStatus;
  reportTitle: string | null;
  reasonCode: ReportFlagReason;
  details: string | null;
  status: ReportFlagStatus;
  createdAt: Date;
  handledAt: Date | null;
  reporter: {
    id: number;
    email: string | null;
    name: string | null;
  };
  handler: {
    id: number;
    name: string | null;
  } | null;
}

type QueryExecutor = Pool | PoolConnection;

@Injectable()
export class ReportFlagRepository {
  constructor(private readonly dbService: DbService) {}

  private getExecutor(conn?: PoolConnection): QueryExecutor {
    return conn ?? this.dbService.getPool();
  }

  async findById(flagId: number, conn?: PoolConnection): Promise<ReportFlagRecord | undefined> {
    const executor = this.getExecutor(conn);
    const [rows] = await executor.query<RowDataPacket[]>(
      'SELECT * FROM report_flags WHERE id = ? LIMIT 1',
      [flagId],
    );
    return (rows as unknown as ReportFlagRecord[])[0];
  }

  async findByUnique(
    reportId: number,
    userId: number,
    reason: ReportFlagReason,
    conn?: PoolConnection,
  ): Promise<ReportFlagRecord | undefined> {
    const executor = this.getExecutor(conn);
    const [rows] = await executor.query<RowDataPacket[]>(
      'SELECT * FROM report_flags WHERE report_id = ? AND reported_by_user_id = ? AND reason_code = ? LIMIT 1',
      [reportId, userId, reason],
    );
    return (rows as unknown as ReportFlagRecord[])[0];
  }

  async insertFlag(
    conn: PoolConnection,
    payload: {
      reportId: number;
      userId: number;
      reason: ReportFlagReason;
      details: string | null;
    },
  ): Promise<number> {
    const [result] = await conn.query<ResultSetHeader>(
      'INSERT INTO report_flags (report_id, reported_by_user_id, reason_code, details) VALUES (?, ?, ?, ?)',
      [payload.reportId, payload.userId, payload.reason, payload.details],
    );
    return result.insertId;
  }

  async updateFlagStatus(
    conn: PoolConnection,
    flagId: number,
    payload: { status: ReportFlagStatus; handledBy: number },
  ): Promise<void> {
    await conn.query(
      'UPDATE report_flags SET status = ?, handled_by_user_id = ?, handled_at = NOW() WHERE id = ?',
      [payload.status, payload.handledBy, flagId],
    );
  }

  async listFlags(params: {
    status?: ReportFlagStatus;
    reportId?: number;
    limit: number;
    offset: number;
  }): Promise<{ items: ReportFlagAdminRow[]; total: number }> {
    const { status, reportId, limit, offset } = params;
    const conditions: string[] = [];
    const values: Array<string | number> = [];

    if (status) {
      conditions.push('f.status = ?');
      values.push(status);
    }

    if (reportId) {
      conditions.push('f.report_id = ?');
      values.push(reportId);
    }

    if (conditions.length === 0) {
      conditions.push('1 = 1');
    }

    const whereClause = conditions.join(' AND ');
    const baseQueryParts = [
      'FROM report_flags f',
      'INNER JOIN reports r ON r.id = f.report_id',
      'LEFT JOIN report_revisions rr ON rr.id = r.current_revision_id',
      'LEFT JOIN users reporter ON reporter.id = f.reported_by_user_id',
      'LEFT JOIN users handler ON handler.id = f.handled_by_user_id',
      'WHERE ' + whereClause,
    ];
    const baseQuery = baseQueryParts.join(' ');

    const listQueryParts = [
      'SELECT',
      'f.id AS flag_id,',
      'f.report_id,',
      'f.reason_code,',
      'f.details,',
      'f.status AS flag_status,',
      'f.created_at,',
      'f.handled_at,',
      'r.status AS report_status,',
      'rr.title AS report_title,',
      'reporter.id AS reporter_id,',
      'reporter.email AS reporter_email,',
      "CONCAT(COALESCE(reporter.first_name, ''), ' ', COALESCE(reporter.last_name, '')) AS reporter_name,",
      'handler.id AS handler_id,',
      "CONCAT(COALESCE(handler.first_name, ''), ' ', COALESCE(handler.last_name, '')) AS handler_name",
      baseQuery,
      'ORDER BY f.created_at DESC, f.id DESC',
      'LIMIT ? OFFSET ?',
    ];
    const listQuery = listQueryParts.join(' ');

    const executor = this.dbService.getPool();
    const [rows] = await executor.query<RowDataPacket[]>(listQuery, [...values, limit, offset]);
    const countQuery = 'SELECT COUNT(*) AS total ' + baseQuery;
    const [countRows] = await executor.query<RowDataPacket[]>(countQuery, values);

    const total = Number((countRows as unknown as Array<{ total: number }>)[0]?.total ?? 0);

    const mappedRows = rows as unknown as Array<{
      flag_id: number;
      report_id: number;
      reason_code: ReportFlagReason;
      details: string | null;
      flag_status: ReportFlagStatus;
      created_at: Date;
      handled_at: Date | null;
      report_status: ReportStatus;
      report_title: string | null;
      reporter_id: number;
      reporter_email: string | null;
      reporter_name: string | null;
      handler_id: number | null;
      handler_name: string | null;
    }>;

    const items = mappedRows.map((row) => ({
      flagId: row.flag_id,
      reportId: row.report_id,
      reportStatus: row.report_status,
      reportTitle: row.report_title ?? null,
      reasonCode: row.reason_code,
      details: row.details ?? null,
      status: row.flag_status,
      createdAt: row.created_at,
      handledAt: row.handled_at ?? null,
      reporter: {
        id: row.reporter_id,
        email: row.reporter_email ?? null,
        name: row.reporter_name?.trim() ? row.reporter_name.trim() : null,
      },
      handler: row.handler_id
        ? {
            id: row.handler_id,
            name: row.handler_name?.trim() ? row.handler_name.trim() : null,
          }
        : null,
    }));

    return { items, total };
  }

  async getCountsByStatus(): Promise<Record<ReportFlagStatus, number>> {
    const counts: Record<ReportFlagStatus, number> = {
      pending: 0,
      validated: 0,
      dismissed: 0,
    };

    const [rows] = await this.dbService
      .getPool()
      .query<RowDataPacket[]>(
        'SELECT status, COUNT(*) AS total FROM report_flags GROUP BY status',
      );

    for (const row of rows as unknown as Array<{ status: ReportFlagStatus; total: number }>) {
      counts[row.status] = Number(row.total ?? 0);
    }

    return counts;
  }
}
