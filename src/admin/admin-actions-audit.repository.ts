/* eslint-disable prettier/prettier */

import { Injectable } from '@nestjs/common';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DbService } from 'src/db/db.service';

export type AdminActionType =
  | 'login'
  | 'approve_report'
  | 'reject_report'
  | 'delete_report'
  | 'block_user'
  | 'unblock_user'
  | 'promote_user'
  | 'demote_user'
  | 'create_category'
  | 'update_category'
  | 'resolve_flag'
  | 'bulk_action';

export type AdminActionTargetType = 'report' | 'user' | 'category' | 'flag' | 'multiple' | null;

export interface AdminActionAuditRecord {
  id: number;
  adminId: number;
  actionType: AdminActionType;
  targetType: AdminActionTargetType;
  targetId: number | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface CreateAdminActionParams {
  adminId: number;
  actionType: AdminActionType;
  targetType?: AdminActionTargetType;
  targetId?: number;
  details?: Record<string, any>;
  ipAddress?: string;
}

export interface AdminPromotionAuditRecord {
  id: number;
  userId: number;
  promotedBy: number;
  fromRole: 'user' | 'admin' | 'superadmin';
  toRole: 'user' | 'admin' | 'superadmin';
  reason: string | null;
  createdAt: Date;
}

export interface CreatePromotionAuditParams {
  userId: number;
  promotedBy: number;
  fromRole: 'user' | 'admin' | 'superadmin';
  toRole: 'user' | 'admin' | 'superadmin';
  reason?: string;
}

export interface ListAuditLogsParams {
  adminId?: number;
  actionType?: AdminActionType;
  targetType?: AdminActionTargetType;
  dateFrom?: Date;
  dateTo?: Date;
  limit: number;
  offset: number;
}

export interface AdminActionAuditRow extends RowDataPacket {
  id: number;
  admin_id: number;
  admin_email: string | null;
  admin_name: string | null;
  action_type: AdminActionType;
  target_type: AdminActionTargetType;
  target_id: number | null;
  details: string | null;
  ip_address: string | null;
  created_at: Date;
}

@Injectable()
export class AdminActionsAuditRepository {
  constructor(private readonly dbService: DbService) {}

  async recordAction(params: CreateAdminActionParams, conn?: PoolConnection): Promise<void> {
    const sql = `
      INSERT INTO admin_actions_audit
      (admin_id, action_type, target_type, target_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const executor = conn || this.dbService.getPool();
    await executor.execute<ResultSetHeader>(sql, [
      params.adminId,
      params.actionType,
      params.targetType ?? null,
      params.targetId ?? null,
      params.details ? JSON.stringify(params.details) : null,
      params.ipAddress ?? null,
    ]);
  }

  async recordPromotion(params: CreatePromotionAuditParams, conn?: PoolConnection): Promise<void> {
    const sql = `
      INSERT INTO admin_promotions_audit
      (user_id, promoted_by, from_role, to_role, reason)
      VALUES (?, ?, ?, ?, ?)
    `;

    const executor = conn || this.dbService.getPool();
    await executor.execute<ResultSetHeader>(sql, [
      params.userId,
      params.promotedBy,
      params.fromRole,
      params.toRole,
      params.reason ?? null,
    ]);
  }

  async listAuditLogs(params: ListAuditLogsParams): Promise<{ items: AdminActionAuditRow[]; total: number }> {
    const limit = Math.max(1, Number.isFinite(params.limit) ? Number(params.limit) : 20);
    const offset = Math.max(0, Number.isFinite(params.offset) ? Number(params.offset) : 0);
    const conditions: string[] = [];
    const values: any[] = [];

    if (params.adminId) {
      conditions.push('aaa.admin_id = ?');
      values.push(params.adminId);
    }

    if (params.actionType) {
      conditions.push('aaa.action_type = ?');
      values.push(params.actionType);
    }

    if (params.targetType) {
      conditions.push('aaa.target_type = ?');
      values.push(params.targetType);
    }

    if (params.dateFrom) {
      conditions.push('aaa.created_at >= ?');
      values.push(params.dateFrom);
    }

    if (params.dateTo) {
      conditions.push('aaa.created_at <= ?');
      values.push(params.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countSql = `SELECT COUNT(*) as total FROM admin_actions_audit aaa ${whereClause}`;
    let total: number;

    if (values.length === 0) {
      const [countRows] = await this.dbService.getPool().query<RowDataPacket[]>(countSql);
      total = (countRows[0] as any).total;
    } else {
      const [countRows] = await this.dbService.getPool().execute<RowDataPacket[]>(countSql, values);
      total = (countRows[0] as any).total;
    }

    // Get items
    const sql = `
      SELECT
        aaa.id,
        aaa.admin_id,
        u.email as admin_email,
        CONCAT(u.first_name, ' ', u.last_name) as admin_name,
        aaa.action_type,
        aaa.target_type,
        aaa.target_id,
        aaa.details,
        aaa.ip_address,
        aaa.created_at
      FROM admin_actions_audit aaa
      LEFT JOIN users u ON u.id = aaa.admin_id
      ${whereClause}
      ORDER BY aaa.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    let rows: AdminActionAuditRow[];
    if (values.length === 0) {
      const [queryRows] = await this.dbService.getPool().query<AdminActionAuditRow[]>(sql);
      rows = queryRows;
    } else {
      const [execRows] = await this.dbService.getPool().execute<AdminActionAuditRow[]>(sql, values);
      rows = execRows;
    }

    return { items: rows, total };
  }

  async getPromotionHistory(userId: number): Promise<AdminPromotionAuditRecord[]> {
    const sql = `
      SELECT
        id,
        user_id,
        promoted_by,
        from_role,
        to_role,
        reason,
        created_at
      FROM admin_promotions_audit
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;

    const [rows] = await this.dbService.getPool().execute<RowDataPacket[]>(sql, [userId]);

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      promotedBy: row.promoted_by,
      fromRole: row.from_role,
      toRole: row.to_role,
      reason: row.reason,
      createdAt: row.created_at,
    }));
  }
}
