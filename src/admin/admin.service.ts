import { Injectable, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { AdminRepository } from './admin.repository';
import { ReportRepository } from 'src/reports/report.repository';
import { GetAdminReportsQueryDto } from './dto/get-admin-reports-query.dto';
import { GetAdminReportsResponseDto } from './dto/get-admin-reports-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { MetricsOverviewDto } from './dto/metrics-overview.dto';
import { MetricsTopCategoryDto } from './dto/metrics-top-category.dto';
import { MetricsTopHostDto } from './dto/metrics-top-host.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly reportRepository: ReportRepository,
  ) {}

  async listReports(query: GetAdminReportsQueryDto): Promise<GetAdminReportsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const { items, total } = await this.reportRepository.findReportsForAdmin({
      status: query.status,
      limit,
      offset,
    });

    return {
      items: items.map((item) => ({
        reportId: item.reportId,
        title: item.title,
        status: item.status,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        author: {
          id: item.authorId,
          email: item.authorEmail,
          name: item.authorName,
        },
        reviewer: item.reviewerId
          ? {
              id: item.reviewerId,
              name: item.reviewerName,
            }
          : null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        reviewedAt: item.reviewedAt ? item.reviewedAt.toISOString() : null,
        publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null,
        reviewNotes: item.reviewNotes ?? null,
        rejectionReasonText: item.rejectionReasonText ?? null,
      })),
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async removeReport(reportId: number, adminId: number): Promise<void> {
    await this.reportRepository.withTransaction(async (conn) => {
      const existing = await this.reportRepository.findReportForUpdate(reportId, conn);
      if (!existing) {
        throw new NotFoundException('Reporte no encontrado');
      }

      await this.reportRepository.updateReportStatus(conn, {
        reportId,
        status: 'removed',
        reviewerId: adminId,
        reviewNotes: null,
        rejectionReasonId: null,
        rejectionReasonText: null,
        lock: true,
        approvedAt: null,
        publishedAt: null,
      });

      await this.reportRepository.softDeleteReport(conn, reportId);
      await this.reportRepository.appendStatusHistory(conn, {
        reportId,
        fromStatus: existing.status,
        toStatus: 'removed',
        changedBy: adminId,
        rejectionReasonId: null,
        rejectionReasonText: null,
        note: 'Removed by admin',
      });
    });
  }

  async listCategories(): Promise<CategoryResponseDto[]> {
    const rows = await this.adminRepository.listCategories();
    return rows.map((row) => this.mapCategory(row));
  }

  async createCategory(payload: CreateCategoryDto): Promise<CategoryResponseDto> {
    const row = await this.adminRepository.createCategory(payload);
    if (!row) {
      throw new NotFoundException('No se pudo crear la categoría');
    }

    return this.mapCategory(row);
  }

  async updateCategory(id: number, payload: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const row = await this.adminRepository.updateCategory(id, payload);
    if (!row) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return this.mapCategory(row);
  }

  async blockUser(userId: number, adminId: number, payload: BlockUserDto): Promise<void> {
    const updated = await this.adminRepository.blockUser(userId, adminId, payload.reason);
    if (!updated) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }

  async unblockUser(userId: number, adminId: number): Promise<void> {
    const updated = await this.adminRepository.unblockUser(userId, adminId);
    if (!updated) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }

  async getMetricsOverview(): Promise<MetricsOverviewDto> {
    const totals = await this.adminRepository.getMetricsOverview();
    return {
      totalUsers: Number(totals.totalUsers ?? 0),
      blockedUsers: Number(totals.blockedUsers ?? 0),
      totalReports: Number(totals.totalReports ?? 0),
      approvedReports: Number(totals.approvedReports ?? 0),
      pendingReports: Number(totals.pendingReports ?? 0),
    };
  }

  async getTopCategories(limit = 5): Promise<MetricsTopCategoryDto[]> {
    const rows = await this.adminRepository.getTopCategories(limit);
    return rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      slug: String(row.slug),
      reportsCount: Number(row.reportsCount ?? 0),
      searchCount: Number(row.searchCount ?? 0),
    }));
  }

  async getTopHosts(limit = 5): Promise<MetricsTopHostDto[]> {
    const rows = await this.adminRepository.getTopHosts(limit);
    return rows.map((row) => ({
      host: String(row.host),
      reportsCount: Number(row.reportsCount ?? 0),
      approvedReportsCount: Number(row.approvedReportsCount ?? 0),
      pendingReportsCount: Number(row.pendingReportsCount ?? 0),
      rejectedReportsCount: Number(row.rejectedReportsCount ?? 0),
      removedReportsCount: Number(row.removedReportsCount ?? 0),
    }));
  }

  private mapCategory(row: RowDataPacket): CategoryResponseDto {
    return {
      id: Number(row.id),
      name: String(row.name),
      slug: String(row.slug),
      description: row.description ?? null,
      is_active: Boolean(row.is_active),
      reports_count: Number(row.reports_count ?? 0),
      search_count: Number(row.search_count ?? 0),
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    };
  }
}
