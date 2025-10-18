import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { AdminRepository } from './admin.repository';
import { ReportRepository } from 'src/reports/report.repository';
import { ReportFlagRepository } from 'src/reports/report-flag.repository';
import type { ReportFlagAdminRow, ReportFlagRecord } from 'src/reports/report-flag.repository';
import { GetAdminReportsQueryDto } from './dto/get-admin-reports-query.dto';
import { GetAdminReportsResponseDto } from './dto/get-admin-reports-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { MetricsOverviewDto } from './dto/metrics-overview.dto';
import { MetricsTopCategoryDto } from './dto/metrics-top-category.dto';
import { MetricsTopHostDto } from './dto/metrics-top-host.dto';

import { GetReportFlagsQueryDto } from './dto/get-report-flags-query.dto';
import { GetReportFlagsResponseDto, AdminReportFlagItemDto } from './dto/get-report-flags-response.dto';
import { ResolveReportFlagDto } from './dto/resolve-report-flag.dto';
import { ReportFlagResponseDto } from 'src/reports/dto/report-flag-response.dto';
import { GetAdminUsersQueryDto } from './dto/get-admin-users-query.dto';
import { GetAdminUsersResponseDto, AdminUserDto } from './dto/get-admin-users-response.dto';
import { AdminReportDetailDto } from './dto/admin-report-detail.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly reportRepository: ReportRepository,
    private readonly reportFlagRepository: ReportFlagRepository,
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

  async getReportDetail(reportId: number): Promise<AdminReportDetailDto> {
    const report = await this.reportRepository.findReportWithRelations(reportId);
    if (!report) {
      throw new NotFoundException('Reporte no encontrado');
    }

    const media = await this.reportRepository.listMediaByRevision(report.revisionId);

    const category = report.categoryId
      ? {
          id: report.categoryId,
          name: report.categoryName ?? null,
          slug: report.categorySlug ?? null,
        }
      : null;

    let displayName = '';
    if (report.authorFirstName?.trim()) {
      displayName = report.authorFirstName.trim();
    }
    if (report.authorLastName?.trim()) {
      displayName = displayName
        ? `${displayName} ${report.authorLastName.trim()}`.trim()
        : report.authorLastName.trim();
    }
    if (!displayName && report.authorUsername?.trim()) {
      displayName = report.authorUsername.trim();
    }

    return {
      status: report.status,
      reportId: report.reportId,
      title: report.title ?? null,
      description: report.description,
      incidentUrl: report.incidentUrl,
      publisherHost: report.publisherHost,
      createdAt: report.createdAt.toISOString(),
      approvedAt: report.approvedAt ? report.approvedAt.toISOString() : null,
      publishedAt: report.publishedAt ? report.publishedAt.toISOString() : null,
      category,
      author: {
        isAnonymous: report.isAnonymous,
        authorId: report.authorId,
        displayName: displayName || null,
      },
      media: media.map((item) => ({
        mediaId: item.mediaId,
        fileUrl: item.fileUrl,
        mediaType: item.mediaType,
        position: item.position,
      })),
      ratingAverage: report.ratingAverage ? Number(report.ratingAverage) : 0,
      ratingCount: Number(report.ratingCount ?? 0),
      reviewNotes: report.reviewNotes ?? null,
      rejectionReasonText: report.rejectionReasonText ?? null,
    };
  }
  async listReportFlags(query: GetReportFlagsQueryDto): Promise<GetReportFlagsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const { items, total } = await this.reportFlagRepository.listFlags({
      status: query.status,
      reportId: query.reportId,
      limit,
      offset,
    });

    const counts = await this.reportFlagRepository.getCountsByStatus();

    return {
      items: items.map((item) => this.mapReportFlagRow(item)),
      meta: {
        page,
        limit,
        total,
      },
      counts: {
        pending: counts.pending ?? 0,
        validated: counts.validated ?? 0,
        dismissed: counts.dismissed ?? 0,
      },
    };
  }

  async resolveReportFlag(flagId: number, adminId: number, dto: ResolveReportFlagDto): Promise<ReportFlagResponseDto> {
    return this.reportRepository.withTransaction(async (conn) => {
      const existing = await this.reportFlagRepository.findById(flagId, conn);
      if (!existing) {
        throw new NotFoundException('Flag no encontrado');
      }

      if (existing.status === dto.status) {
        throw new BadRequestException('El flag ya se encuentra en este estado');
      }

      await this.reportFlagRepository.updateFlagStatus(conn, flagId, {
        status: dto.status,
        handledBy: adminId,
      });

      const updated = await this.reportFlagRepository.findById(flagId, conn);
      if (!updated) {
        throw new NotFoundException('Flag no encontrado luego de actualizar');
      }

      return this.mapFlagRecordToResponse(updated);
    });
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

  async listUsers(query: GetAdminUsersQueryDto): Promise<GetAdminUsersResponseDto> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const offset = (page - 1) * limit;

    const { items, total, counts } = await this.adminRepository.listUsers({
      is_blocked: query.is_blocked === 'true' ? true : query.is_blocked === 'false' ? false : undefined,
      search: query.search,
      limit,
      offset,
    });

    return {
      items: items.map((row) => ({
        id: Number(row.id),
        email: String(row.email),
        username: String(row.username),
        first_name: String(row.first_name),
        last_name: String(row.last_name),
        phone_number: row.phone_number ?? null,
        role: row.role as 'user' | 'admin',
        is_blocked: Boolean(row.is_blocked),
        blocked_at: row.blocked_at ? new Date(row.blocked_at) : null,
        blocked_reason: row.blocked_reason ?? null,
        blocked_by: row.blocked_by ? Number(row.blocked_by) : null,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      })),
      meta: {
        page,
        limit,
        total,
      },
      counts: {
        total: counts.total || 0,
        blocked: counts.blocked || 0,
        active: counts.active || 0,
      },
    };
  }

  async getMetricsOverview(): Promise<MetricsOverviewDto> {
    const totals = await this.adminRepository.getMetricsOverview();
    return {
      totalUsers: Number(totals.totalUsers ?? 0),
      blockedUsers: Number(totals.blockedUsers ?? 0),
      totalReports: Number(totals.totalReports ?? 0),
      approvedReports: Number(totals.approvedReports ?? 0),
      pendingReports: Number(totals.pendingReports ?? 0),
      totalFlags: Number(totals.totalFlags ?? 0),
      pendingFlags: Number(totals.pendingFlags ?? 0),
      validatedFlags: Number(totals.validatedFlags ?? 0),
      dismissedFlags: Number(totals.dismissedFlags ?? 0),
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

  private mapReportFlagRow(row: ReportFlagAdminRow): AdminReportFlagItemDto {
    return {
      flagId: row.flagId,
      reportId: row.reportId,
      reportTitle: row.reportTitle,
      reportStatus: row.reportStatus,
      reasonCode: row.reasonCode,
      details: row.details ?? null,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      handledAt: row.handledAt ? row.handledAt.toISOString() : null,
      reporter: {
        id: row.reporter.id,
        email: row.reporter.email ?? null,
        name: row.reporter.name ?? null,
      },
      handler: row.handler
        ? {
            id: row.handler.id,
            name: row.handler.name ?? null,
          }
        : null,
    };
  }

  private mapFlagRecordToResponse(record: ReportFlagRecord): ReportFlagResponseDto {
    return {
      flagId: record.id,
      reportId: record.report_id,
      status: record.status,
      reasonCode: record.reason_code,
      details: record.details ?? null,
      createdAt: record.created_at.toISOString(),
      handledAt: record.handled_at ? record.handled_at.toISOString() : null,
    };
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



