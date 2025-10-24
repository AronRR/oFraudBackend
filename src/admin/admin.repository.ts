import { Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { DbService } from 'src/db/db.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class AdminRepository {
  constructor(private readonly dbService: DbService) {}

  async listCategories(): Promise<RowDataPacket[]> {
    const sql = `
      SELECT
        id,
        name,
        slug,
        description,
        is_active,
        reports_count,
        search_count,
        created_at,
        updated_at
      FROM categories
      ORDER BY name ASC
    `;

    const [rows] = await this.dbService.getPool().query<RowDataPacket[]>(sql);
    return rows;
  }

  async createCategory(payload: CreateCategoryDto): Promise<RowDataPacket | null> {
    const sql = `
      INSERT INTO categories (name, slug, description, is_active)
      VALUES (?, ?, ?, ?)
    `;

    const params = [
      payload.name,
      payload.slug,
      payload.description ?? null,
      payload.is_active ?? true,
    ];

    const [result] = await this.dbService
      .getPool()
      .execute<ResultSetHeader>(sql, params);

    return this.findCategoryById(result.insertId);
  }

  async updateCategory(id: number, payload: UpdateCategoryDto): Promise<RowDataPacket | null> {
    const fields: string[] = [];
    const params: Array<string | number | boolean | null> = [];

    if (payload.name !== undefined) {
      fields.push('name = ?');
      params.push(payload.name);
    }

    if (payload.slug !== undefined) {
      fields.push('slug = ?');
      params.push(payload.slug);
    }

    if (payload.description !== undefined) {
      fields.push('description = ?');
      params.push(payload.description ?? null);
    }

    if (payload.is_active !== undefined) {
      fields.push('is_active = ?');
      params.push(payload.is_active);
    }

    if (payload.reports_count !== undefined) {
      fields.push('reports_count = ?');
      params.push(payload.reports_count);
    }

    if (payload.search_count !== undefined) {
      fields.push('search_count = ?');
      params.push(payload.search_count);
    }

    if (fields.length === 0) {
      return this.findCategoryById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    const updateSql = `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);

    await this.dbService.getPool().execute<ResultSetHeader>(updateSql, params);

    return this.findCategoryById(id);
  }

  async findCategoryById(id: number): Promise<RowDataPacket | null> {
    const sql = `
      SELECT
        id,
        name,
        slug,
        description,
        is_active,
        reports_count,
        search_count,
        created_at,
        updated_at
      FROM categories
      WHERE id = ?
      LIMIT 1
    `;

    const [rows] = await this.dbService
      .getPool()
      .execute<RowDataPacket[]>(sql, [id]);

    return rows.length > 0 ? rows[0] : null;
  }

  async listUsers(params: {
    is_blocked?: boolean;
    search?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: RowDataPacket[]; total: number; counts: { total: number; blocked: number; active: number } }> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (params.is_blocked !== undefined) {
      conditions.push('is_blocked = ?');
      values.push(params.is_blocked ? 1 : 0);
    }

    if (params.search) {
      conditions.push('(email LIKE ? OR username LIKE ? OR first_name LIKE ? OR last_name LIKE ?)');
      const searchPattern = `%${params.search}%`;
      values.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Ensure limit and offset are valid integers
    const safeLimit = Number.isFinite(params.limit) && params.limit > 0 ? Math.floor(params.limit) : 20;
    const safeOffset = Number.isFinite(params.offset) && params.offset >= 0 ? Math.floor(params.offset) : 0;

    const query = `SELECT id, email, username, first_name, last_name, phone_number, role, is_blocked,
              blocked_at, blocked_reason, blocked_by, created_at, updated_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`;

    const [items] = values.length > 0
      ? await this.dbService.getPool().execute<RowDataPacket[]>(query, values)
      : await this.dbService.getPool().query<RowDataPacket[]>(query);

    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const [[{ total }]] = values.length > 0
      ? await this.dbService.getPool().execute<RowDataPacket[]>(countQuery, values)
      : await this.dbService.getPool().query<RowDataPacket[]>(countQuery);

    const [[counts]] = await this.dbService.getPool().query<RowDataPacket[]>(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END) as blocked,
         SUM(CASE WHEN is_blocked = 0 THEN 1 ELSE 0 END) as active
       FROM users`,
    );

    return {
      items,
      total: Number(total),
      counts: {
        total: Number(counts.total || 0),
        blocked: Number(counts.blocked || 0),
        active: Number(counts.active || 0),
      },
    };
  }

  async blockUser(userId: number, adminId: number, reason?: string): Promise<boolean> {
    const sql = `
      UPDATE users
      SET is_blocked = 1,
          blocked_reason = ?,
          blocked_by = ?,
          blocked_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const [result] = await this.dbService
      .getPool()
      .execute<ResultSetHeader>(sql, [reason ?? null, adminId, userId]);

    if (result.affectedRows === 0) {
      return false;
    }

    await this.insertBlockEvent(userId, adminId, 'blocked', reason ?? null);
    return true;
  }

  async unblockUser(userId: number, adminId: number): Promise<boolean> {
    const sql = `
      UPDATE users
      SET is_blocked = 0,
          blocked_reason = NULL,
          blocked_by = ?,
          blocked_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const [result] = await this.dbService.getPool().execute<ResultSetHeader>(sql, [adminId, userId]);

    if (result.affectedRows === 0) {
      return false;
    }

    await this.insertBlockEvent(userId, adminId, 'unblocked', null);
    return true;
  }

  private async insertBlockEvent(
    userId: number,
    adminId: number,
    action: 'blocked' | 'unblocked',
    reason: string | null,
  ): Promise<void> {
    const sql = `
      INSERT INTO user_block_events (user_id, action, reason, blocked_by_user_id)
      VALUES (?, ?, ?, ?)
    `;

    await this.dbService.getPool().execute(sql, [userId, action, reason ?? null, adminId]);
  }

  async getMetricsOverview(): Promise<{ [key: string]: number }> {
    const pool = this.dbService.getPool();

    const [userCounts] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        COUNT(*) AS totalUsers,
        COALESCE(SUM(is_blocked = 1), 0) AS blockedUsers
      FROM users
    `,
    );

    const [reportCounts] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        COUNT(*) AS totalReports,
        COALESCE(SUM(status = 'approved'), 0) AS approvedReports,
        COALESCE(SUM(status = 'pending'), 0) AS pendingReports
      FROM reports
    `,
    );

    const [flagCounts] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        COUNT(*) AS totalFlags,
        COALESCE(SUM(status = 'pending'), 0) AS pendingFlags,
        COALESCE(SUM(status = 'validated'), 0) AS validatedFlags,
        COALESCE(SUM(status = 'dismissed'), 0) AS dismissedFlags
      FROM report_flags
    `,
    );

    const totals = { ...userCounts[0], ...reportCounts[0], ...flagCounts[0] } as unknown as {
      totalUsers: number;
      blockedUsers: number;
      totalReports: number;
      approvedReports: number;
      pendingReports: number;
      totalFlags: number;
      pendingFlags: number;
      validatedFlags: number;
      dismissedFlags: number;
    };

    return totals;
  }

  async getTopCategories(limit: number): Promise<RowDataPacket[]> {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 5;
    const sql = `
      SELECT id, name, slug, reports_count AS reportsCount, search_count AS searchCount
      FROM categories
      ORDER BY reports_count DESC, search_count DESC
      LIMIT ${safeLimit}
    `;

    const [rows] = await this.dbService
      .getPool()
      .query<RowDataPacket[]>(sql);

    return rows;
  }

  async getTopHosts(limit: number): Promise<RowDataPacket[]> {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 5;
    const sql = `
      SELECT
        approved.host,
        COALESCE(totals.totalReportsCount, 0) AS reportsCount,
        approved.approvedReportsCount,
        COALESCE(totals.pendingReportsCount, 0) AS pendingReportsCount,
        COALESCE(totals.rejectedReportsCount, 0) AS rejectedReportsCount,
        COALESCE(totals.removedReportsCount, 0) AS removedReportsCount
      FROM (
        SELECT
          rr.publisher_host AS host,
          COUNT(*) AS approvedReportsCount
        FROM reports r
        INNER JOIN report_revisions rr ON rr.id = r.current_revision_id
        WHERE r.status = 'approved' AND rr.publisher_host IS NOT NULL AND rr.publisher_host <> ''
        GROUP BY rr.publisher_host
      ) AS approved
      LEFT JOIN (
        SELECT
          rr.publisher_host AS host,
          COUNT(*) AS totalReportsCount,
          SUM(r.status = 'pending') AS pendingReportsCount,
          SUM(r.status = 'rejected') AS rejectedReportsCount,
          SUM(r.status = 'removed') AS removedReportsCount
        FROM reports r
        INNER JOIN report_revisions rr ON rr.id = r.current_revision_id
        WHERE rr.publisher_host IS NOT NULL AND rr.publisher_host <> ''
        GROUP BY rr.publisher_host
      ) AS totals ON totals.host = approved.host
      ORDER BY approved.approvedReportsCount DESC, COALESCE(totals.totalReportsCount, 0) DESC
      LIMIT ${safeLimit}
    `;

    const [rows] = await this.dbService
      .getPool()
      .query<RowDataPacket[]>(sql);

    return rows;
  }

  async listAdmins(): Promise<RowDataPacket[]> {
    const sql = `
      SELECT
        id,
        email,
        username,
        first_name,
        last_name,
        role,
        created_at,
        last_login_at
      FROM users
      WHERE role IN ('admin', 'superadmin') AND deleted_at IS NULL
      ORDER BY role DESC, created_at DESC
    `;

    const [rows] = await this.dbService.getPool().query<RowDataPacket[]>(sql);
    return rows;
  }

  async promoteUserToAdmin(userId: number): Promise<boolean> {
    const sql = `UPDATE users SET role = 'admin', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = 'user' AND deleted_at IS NULL`;
    const [result] = await this.dbService.getPool().execute<ResultSetHeader>(sql, [userId]);
    return result.affectedRows > 0;
  }

  async demoteAdminToUser(userId: number): Promise<boolean> {
    const sql = `UPDATE users SET role = 'user', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = 'admin' AND deleted_at IS NULL`;
    const [result] = await this.dbService.getPool().execute<ResultSetHeader>(sql, [userId]);
    return result.affectedRows > 0;
  }
}
