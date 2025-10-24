/* eslint-disable prettier/prettier */

import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { TopHostDto } from './dto/top-host.dto';
import { TopCategoryDto } from './dto/top-category.dto';
import { FraudStatsDto } from './dto/fraud-stats.dto';
import { EducationalContentDto } from './dto/educational-content.dto';
import * as educationalData from './content/educational-content.json';

@Injectable()
export class InsightsService {
  constructor(private readonly dbService: DbService) {}

  /**
   * Obtiene los hosts con más reportes en un período específico
   */
  async getTopHosts(period: 'weekly' | 'monthly' = 'weekly', limit = 10): Promise<TopHostDto[]> {
    const pool = this.dbService.getPool();

    // Calcular fecha de inicio según el período
    const daysAgo = period === 'weekly' ? 7 : 30;

    const query = `
      SELECT
        rr.publisher_host AS host,
        COUNT(DISTINCT r.id) AS reportCount,
        AVG(r.rating_average) AS averageRating,
        SUM(r.rating_count) AS totalRatings
      FROM reports r
      INNER JOIN report_revisions rr ON r.current_revision_id = rr.id
      WHERE r.status = 'approved'
        AND r.approved_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND r.deleted_at IS NULL
      GROUP BY rr.publisher_host
      ORDER BY reportCount DESC, averageRating DESC
      LIMIT ?
    `;

    const [rows] = await pool.query(query, [daysAgo, limit]);

    return (rows as any[]).map((row) => ({
      host: row.host,
      reportCount: Number(row.reportCount),
      averageRating: row.averageRating != null ? Number(row.averageRating) : null,
      totalRatings: Number(row.totalRatings ?? 0),
    }));
  }

  /**
   * Obtiene las categorías más activas (reportes + búsquedas)
   */
  async getTopCategories(limit = 10): Promise<TopCategoryDto[]> {
    const pool = this.dbService.getPool();

    const query = `
      SELECT
        id,
        name,
        slug,
        reports_count AS reportsCount,
        search_count AS searchCount,
        (reports_count + search_count) AS totalActivity
      FROM categories
      WHERE is_active = 1
      ORDER BY totalActivity DESC, reportsCount DESC
      LIMIT ?
    `;

    const [rows] = await pool.query(query, [limit]);

    return (rows as any[]).map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      slug: String(row.slug),
      reportsCount: Number(row.reportsCount ?? 0),
      searchCount: Number(row.searchCount ?? 0),
      totalActivity: Number(row.totalActivity ?? 0),
    }));
  }

  /**
   * Obtiene estadísticas generales del sistema
   */
  async getFraudStats(): Promise<FraudStatsDto> {
    const pool = this.dbService.getPool();

    // Total de reportes aprobados
    const [totalRows] = await pool.query(
      `SELECT COUNT(*) as total FROM reports WHERE status = 'approved' AND deleted_at IS NULL`
    );
    const totalReportsApproved = Number((totalRows as any)[0].total);

    // Reportes de esta semana
    const [weekRows] = await pool.query(
      `SELECT COUNT(*) as total FROM reports
       WHERE status = 'approved'
       AND approved_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       AND deleted_at IS NULL`
    );
    const reportsThisWeek = Number((weekRows as any)[0].total);

    // Reportes de este mes
    const [monthRows] = await pool.query(
      `SELECT COUNT(*) as total FROM reports
       WHERE status = 'approved'
       AND approved_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       AND deleted_at IS NULL`
    );
    const reportsThisMonth = Number((monthRows as any)[0].total);

    // Total de usuarios activos (con al menos un reporte aprobado)
    const [usersRows] = await pool.query(
      `SELECT COUNT(DISTINCT author_id) as total FROM reports
       WHERE status = 'approved' AND deleted_at IS NULL`
    );
    const totalActiveUsers = Number((usersRows as any)[0].total);

    // Total de categorías activas
    const [categoriesRows] = await pool.query(
      `SELECT COUNT(*) as total FROM categories WHERE is_active = 1`
    );
    const categoriesCount = Number((categoriesRows as any)[0].total);

    return {
      averageDetectionDays: 28, // Valor estático basado en estudios
      totalReportsApproved,
      reportsThisWeek,
      reportsThisMonth,
      totalActiveUsers,
      categoriesCount,
    };
  }

  /**
   * Obtiene contenido educativo por tema
   */
  async getEducationalContent(topic: string): Promise<EducationalContentDto> {
    const content = (educationalData as any)[topic];

    if (!content) {
      throw new NotFoundException(`Educational content for topic "${topic}" not found`);
    }

    return content;
  }

  /**
   * Lista todos los temas educativos disponibles
   */
  async listEducationalTopics(): Promise<{ topic: string; title: string }[]> {
    const topics = Object.keys(educationalData)
      .map((key) => ({
        topic: key,
        title: (educationalData as any)[key].title,
      }))
      .filter((item) => item.title !== undefined && item.title !== null); // Filter out entries without title

    return topics;
  }
}
