/* eslint-disable prettier/prettier */

import { Injectable } from '@nestjs/common';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { DbService } from 'src/db/db.service';

export type ReportStatus = 'pending' | 'approved' | 'rejected' | 'removed';

export interface ReportRecord {
  id: number;
  author_id: number;
  category_id: number;
  current_revision_id: number | null;
  status: ReportStatus;
  reviewed_by: number | null;
  reviewed_at: Date | null;
  approved_at: Date | null;
  review_notes: string | null;
  rejection_reason_id: number | null;
  rejection_reason_text: string | null;
  is_locked: number;
  is_anonymous: number;
  rating_average: string;
  rating_count: number;
  published_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ReportRevisionRecord {
  id: number;
  report_id: number;
  version_number: number;
  title: string | null;
  description: string;
  incident_url: string;
  publisher_host: string;
  is_anonymous: number;
  created_by_user_id: number;
  created_at: Date;
}

@Injectable()
export class ReportRepository {
  constructor(private readonly dbService: DbService) {}

  async withTransaction<T>(handler: (conn: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.dbService.getPool().getConnection();
    try {
      await connection.beginTransaction();
      const result = await handler(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async findReportById(reportId: number): Promise<ReportRecord | undefined> {
    const [rows] = await this.dbService
      .getPool()
      .query<RowDataPacket[]>(
        'SELECT * FROM reports WHERE id = ? AND deleted_at IS NULL LIMIT 1',
        [reportId],
      );
    return (rows as unknown as ReportRecord[])[0];
  }

  async findReportForUpdate(reportId: number, conn: PoolConnection): Promise<ReportRecord | undefined> {
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT * FROM reports WHERE id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE',
      [reportId],
    );
    return (rows as unknown as ReportRecord[])[0];
  }

  async getLatestRevision(reportId: number): Promise<ReportRevisionRecord | undefined> {
    const [rows] = await this.dbService
      .getPool()
      .query<RowDataPacket[]>(
        'SELECT * FROM report_revisions WHERE report_id = ? ORDER BY version_number DESC LIMIT 1',
        [reportId],
      );
    return (rows as unknown as ReportRevisionRecord[])[0];
  }

  async getLatestRevisionWithLock(reportId: number, conn: PoolConnection): Promise<ReportRevisionRecord | undefined> {
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT * FROM report_revisions WHERE report_id = ? ORDER BY version_number DESC LIMIT 1 FOR UPDATE',
      [reportId],
    );
    return (rows as unknown as ReportRevisionRecord[])[0];
  }

  async findRevisionById(revisionId: number, conn?: PoolConnection): Promise<(ReportRevisionRecord & { report_status: ReportStatus; report_author_id: number }) | undefined> {
    const executor = conn ?? this.dbService.getPool();
    const [rows] = await executor.query<RowDataPacket[]>(
      `SELECT rr.*, r.status as report_status, r.author_id as report_author_id
       FROM report_revisions rr
       INNER JOIN reports r ON r.id = rr.report_id
       WHERE rr.id = ? AND r.deleted_at IS NULL
       LIMIT 1`,
      [revisionId],
    );
    return (rows as unknown as Array<ReportRevisionRecord & { report_status: ReportStatus; report_author_id: number }>)[0];
  }

  async createReport(
    conn: PoolConnection,
    payload: {
      authorId: number;
      categoryId: number;
      isAnonymous: boolean;
      status?: ReportStatus;
    },
  ): Promise<number> {
    const { authorId, categoryId, isAnonymous, status = 'pending' } = payload;
    const [result] = await conn.query<{ insertId: number }>(
      'INSERT INTO reports (author_id, category_id, status, is_anonymous) VALUES (?, ?, ?, ?)',
      [authorId, categoryId, status, isAnonymous ? 1 : 0],
    );
    return result.insertId;
  }

  async createRevision(
    conn: PoolConnection,
    payload: {
      reportId: number;
      title: string | null;
      description: string;
      incidentUrl: string;
      publisherHost: string;
      isAnonymous: boolean;
      createdBy: number;
      versionNumber: number;
    },
  ): Promise<number> {
    const [result] = await conn.query<{ insertId: number }>(
      'INSERT INTO report_revisions (report_id, version_number, title, description, incident_url, publisher_host, is_anonymous, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        payload.reportId,
        payload.versionNumber,
        payload.title,
        payload.description,
        payload.incidentUrl,
        payload.publisherHost,
        payload.isAnonymous ? 1 : 0,
        payload.createdBy,
      ],
    );
    return result.insertId;
  }

  async getNextRevisionNumber(reportId: number, conn: PoolConnection): Promise<number> {
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM report_revisions WHERE report_id = ?',
      [reportId],
    );
    const result = rows as unknown as Array<{ next_version: number }>;
    return result[0]?.next_version ?? 1;
  }

  async updateReportCurrentRevision(
    conn: PoolConnection,
    reportId: number,
    revisionId: number,
  ): Promise<void> {
    await conn.query('UPDATE reports SET current_revision_id = ?, updated_at = NOW() WHERE id = ?', [revisionId, reportId]);
  }

  async appendStatusHistory(
    conn: PoolConnection,
    payload: {
      reportId: number;
      fromStatus: ReportStatus | null;
      toStatus: ReportStatus;
      changedBy: number;
      rejectionReasonId?: number | null;
      rejectionReasonCode?: string | null;
      rejectionReasonText?: string | null;
      note?: string | null;
    },
  ): Promise<void> {
    await conn.query(
      'INSERT INTO report_status_history (report_id, from_status, to_status, rejection_reason_id, rejection_reason_code, rejection_reason_text, note, changed_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        payload.reportId,
        payload.fromStatus,
        payload.toStatus,
        payload.rejectionReasonId ?? null,
        payload.rejectionReasonCode ?? null,
        payload.rejectionReasonText ?? null,
        payload.note ?? null,
        payload.changedBy,
      ],
    );
  }

  async updateReportStatus(
    conn: PoolConnection,
    payload: {
      reportId: number;
      status: ReportStatus;
      reviewerId: number;
      reviewNotes?: string | null;
      rejectionReasonId?: number | null;
      rejectionReasonText?: string | null;
      lock?: boolean;
      approvedAt?: Date | null;
      publishedAt?: Date | null;
    },
  ): Promise<void> {
    await conn.query(
      'UPDATE reports SET status = ?, reviewed_by = ?, reviewed_at = NOW(), approved_at = ?, review_notes = ?, rejection_reason_id = ?, rejection_reason_text = ?, is_locked = ?, published_at = ?, updated_at = NOW() WHERE id = ?',
      [
        payload.status,
        payload.reviewerId,
        payload.approvedAt ?? null,
        payload.reviewNotes ?? null,
        payload.rejectionReasonId ?? null,
        payload.rejectionReasonText ?? null,
        payload.lock ? 1 : 0,
        payload.publishedAt ?? null,
        payload.reportId,
      ],
    );
  }

  async insertMedia(
    conn: PoolConnection,
    payload: { revisionId: number; fileUrl: string; storageKey?: string | null; mediaType?: string; position: number },
  ): Promise<number> {
    const [result] = await conn.query<{ insertId: number }>(
      'INSERT INTO report_media (revision_id, file_url, storage_key, media_type, position) VALUES (?, ?, ?, ?, ?)',
      [
        payload.revisionId,
        payload.fileUrl,
        payload.storageKey ?? null,
        payload.mediaType ?? 'image',
        payload.position,
      ],
    );
    return result.insertId;
  }

  async countMediaForRevision(revisionId: number, conn?: PoolConnection): Promise<number> {
    const executor = conn ?? this.dbService.getPool();
    const [rows] = await executor.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM report_media WHERE revision_id = ? AND (deleted_at IS NULL)',
      [revisionId],
    );
    const result = rows as unknown as Array<{ total: number }>;
    return result[0]?.total ?? 0;
  }

  async softDeleteMediaByRevision(conn: PoolConnection, revisionId: number): Promise<void> {
    await conn.query('UPDATE report_media SET deleted_at = NOW() WHERE revision_id = ?', [revisionId]);
  }
}
