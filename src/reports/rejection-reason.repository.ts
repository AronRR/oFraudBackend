/* eslint-disable prettier/prettier */

import { Injectable } from '@nestjs/common';
import type { RowDataPacket } from 'mysql2/promise';
import { DbService } from 'src/db/db.service';

export interface RejectionReasonRecord {
  id: number;
  code: string;
  label: string;
  description: string | null;
  is_active: number;
}

@Injectable()
export class RejectionReasonRepository {
  constructor(private readonly dbService: DbService) {}

  async findById(id: number): Promise<RejectionReasonRecord | undefined> {
    const [rows] = await this.dbService
      .getPool()
      .query<RowDataPacket[]>(
        'SELECT * FROM report_rejection_reasons WHERE id = ? AND is_active = 1 LIMIT 1',
        [id],
      );
    return (rows as unknown as RejectionReasonRecord[])[0];
  }

  async findByCode(code: string): Promise<RejectionReasonRecord | undefined> {
    const [rows] = await this.dbService
      .getPool()
      .query<RowDataPacket[]>(
        'SELECT * FROM report_rejection_reasons WHERE code = ? AND is_active = 1 LIMIT 1',
        [code],
      );
    return (rows as unknown as RejectionReasonRecord[])[0];
  }

  async ensureSeeded(seedData: ReadonlyArray<{ code: string; label: string; description?: string }>): Promise<void> {
    const pool = this.dbService.getPool();
    for (const item of seedData) {
      await pool.query(
        'INSERT INTO report_rejection_reasons (code, label, description, is_active) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE label = VALUES(label), description = VALUES(description), is_active = 1',
        [item.code, item.label, item.description ?? null],
      );
    }
  }
}
