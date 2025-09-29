/* eslint-disable prettier/prettier */

import { Injectable } from '@nestjs/common';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
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

export type FindApprovedReportsSort = 'recent' | 'rating' | 'popular';

export interface ApprovedReportWithRevision {
  reportId: number;
  categoryId: number;
  categoryName: string | null;
  categorySlug: string | null;
  ratingAverage: string;
  ratingCount: number;
  publishedAt: Date | null;
  approvedAt: Date | null;
  createdAt: Date;
  title: string | null;
  description: string;
  incidentUrl: string;
  publisherHost: string;
}

export interface TopHostInsightRow {
  host: string;
  reportCount: number;
  averageRating: string | null;
  totalRatings: number;
}

export interface AuthorReportRow {
  reportId: number;
  title: string | null;
  status: ReportStatus;
  categoryId: number;
  categoryName: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastEditedAt: Date | null;
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
    const [result] = await conn.query<ResultSetHeader>(
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
    const [result] = await conn.query<ResultSetHeader>(
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
    const [result] = await conn.query<ResultSetHeader>(
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

  async findApprovedReports(filters: {
    categoryId?: number;
    host?: string;
    search?: string;
    sort?: FindApprovedReportsSort;
    limit?: number;
    offset?: number;
  }): Promise<{ feed: ApprovedReportWithRevision[]; topHosts: TopHostInsightRow[] }> {
    const {
      categoryId,
      host,
      search,
      sort = 'recent',
      limit = 20,
      offset = 0,
    } = filters;

    const baseConditions: string[] = ["r.status = 'approved'", 'r.deleted_at IS NULL'];
    const feedConditions = [...baseConditions];
    const feedParams: Array<number | string> = [];

    if (categoryId) {
      feedConditions.push('r.category_id = ?');
      feedParams.push(categoryId);
    }

    if (host) {
      feedConditions.push('rr.publisher_host = ?');
      feedParams.push(host);
    }

    if (search) {
      const term = `%${search}%`;
      feedConditions.push('(rr.title LIKE ? OR rr.description LIKE ? OR rr.publisher_host LIKE ?)');
      feedParams.push(term, term, term);
    }

    let orderClause = 'r.published_at DESC, r.approved_at DESC, r.created_at DESC';
    if (sort === 'rating') {
      orderClause = 'r.rating_average DESC, r.rating_count DESC, r.published_at DESC';
    } else if (sort === 'popular') {
      orderClause = 'r.rating_count DESC, r.rating_average DESC, r.published_at DESC';
    }

    const feedQuery = `
      SELECT
        r.id AS report_id,
        r.category_id,
        c.name AS category_name,
        c.slug AS category_slug,
        r.rating_average,
        r.rating_count,
        r.published_at,
        r.approved_at,
        r.created_at,
        rr.title,
        rr.description,
        rr.incident_url,
        rr.publisher_host
      FROM reports r
      INNER JOIN report_revisions rr ON rr.id = r.current_revision_id
      LEFT JOIN categories c ON c.id = r.category_id
      WHERE ${feedConditions.join(' AND ')}
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
    `;

    const feedResultParams = [...feedParams, limit, offset];
    const [feedRows] = await this.dbService
      .getPool()
      .query<RowDataPacket[]>(feedQuery, feedResultParams);

    const insightsConditions = [...baseConditions];
    const insightsParams: Array<number | string> = [];

    if (categoryId) {
      insightsConditions.push('r.category_id = ?');
      insightsParams.push(categoryId);
    }

    if (host) {
      insightsConditions.push('rr.publisher_host = ?');
      insightsParams.push(host);
    }

    if (search) {
      const term = `%${search}%`;
      insightsConditions.push('(rr.title LIKE ? OR rr.description LIKE ? OR rr.publisher_host LIKE ?)');
      insightsParams.push(term, term, term);
    }

    const insightsQuery = `
      SELECT
        rr.publisher_host AS host,
        COUNT(*) AS report_count,
        AVG(r.rating_average) AS average_rating,
        SUM(r.rating_count) AS total_ratings
      FROM reports r
      INNER JOIN report_revisions rr ON rr.id = r.current_revision_id
      WHERE ${insightsConditions.join(' AND ')}
      GROUP BY rr.publisher_host
      HAVING rr.publisher_host <> ''
      ORDER BY report_count DESC, average_rating DESC
      LIMIT 5
    `;

    const [insightRows] = await this.dbService
      .getPool()
      .query<RowDataPacket[]>(insightsQuery, insightsParams);

    return {
      feed: feedRows.map((row) => ({
        reportId: row.report_id as number,
        categoryId: row.category_id as number,
        categoryName: (row.category_name as string | null) ?? null,
        categorySlug: (row.category_slug as string | null) ?? null,
        ratingAverage: row.rating_average as string,
        ratingCount: Number(row.rating_count),
        publishedAt: (row.published_at as Date | null) ?? null,
        approvedAt: (row.approved_at as Date | null) ?? null,
        createdAt: row.created_at as Date,
        title: (row.title as string | null) ?? null,
        description: row.description as string,
        incidentUrl: row.incident_url as string,
        publisherHost: row.publisher_host as string,
      })),
      topHosts: (insightRows as unknown as Array<{ host: string; report_count: number; average_rating: string | null; total_ratings: number }>).map(
        (row) => ({
          host: row.host,
          reportCount: Number(row.report_count),
          averageRating: row.average_rating,
          totalRatings: Number(row.total_ratings ?? 0),
        }),
      ),
    };
  }

  async findReportsByAuthor(params: {
    authorId: number;
    status?: ReportStatus;
    limit: number;
    offset: number;
  }): Promise<{ items: AuthorReportRow[]; total: number }> {
    const { authorId, status, limit, offset } = params;

    const conditions = ['r.author_id = ?', 'r.deleted_at IS NULL'];
    const values: Array<number | string> = [authorId];

    if (status) {
      conditions.push('r.status = ?');
      values.push(status);
    }

    const baseQuery = `
      FROM reports r
      LEFT JOIN report_revisions rr ON rr.id = r.current_revision_id
      LEFT JOIN categories c ON c.id = r.category_id
      WHERE ${conditions.join(' AND ')}
    `;

    const listQuery = `
      SELECT
        r.id AS report_id,
        r.status,
        r.category_id,
        c.name AS category_name,
        r.created_at,
        r.updated_at,
        rr.title,
        rr.created_at AS revision_created_at
      ${baseQuery}
      ORDER BY r.updated_at DESC, r.id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await this.dbService
      .getPool()
      .query<RowDataPacket[]>(listQuery, [...values, limit, offset]);

    const [countRows] = await this.dbService
      .getPool()
      .query<RowDataPacket[]>(`SELECT COUNT(*) as total ${baseQuery}`, values);

    const total = Number((countRows as unknown as Array<{ total: number }>)[0]?.total ?? 0);

    const items = (rows as unknown as Array<{
      report_id: number;
      status: ReportStatus;
      category_id: number;
      category_name: string | null;
      created_at: Date;
      updated_at: Date;
      title: string | null;
      revision_created_at: Date | null;
    }>).map((row) => ({
      reportId: row.report_id,
      title: row.title ?? null,
      status: row.status,
      categoryId: row.category_id,
      categoryName: row.category_name ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastEditedAt: row.revision_created_at ?? row.updated_at,
    }));

    return { items, total };
  }

  async softDeleteReport(conn: PoolConnection, reportId: number): Promise<void> {
    await conn.query(
      'UPDATE reports SET status = ?, deleted_at = NOW(), updated_at = NOW() WHERE id = ?',
      ['removed', reportId],
    );
  }
}
