import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { AdminRepository } from './admin.repository';
import { AdminActionsAuditRepository } from './admin-actions-audit.repository';
import { ReportRepository } from 'src/reports/report.repository';
import { ReportFlagRepository } from 'src/reports/report-flag.repository';
import { UserRepository } from 'src/users/user.repository';
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
import { PromoteUserDto } from './dto/promote-user.dto';
import { DemoteUserDto } from './dto/demote-user.dto';
import { GetAdminsResponseDto, AdminListItemDto } from './dto/get-admins-response.dto';
import { GetAuditLogsQueryDto } from './dto/get-audit-logs-query.dto';
import { GetAuditLogsResponseDto, AdminActionAuditItemDto } from './dto/get-audit-logs-response.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly adminActionsAuditRepository: AdminActionsAuditRepository,
    private readonly reportRepository: ReportRepository,
    private readonly reportFlagRepository: ReportFlagRepository,
    private readonly userRepository: UserRepository,
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
        thumbnailUrl: item.thumbnailUrl ?? null,
        thumbnailType: item.thumbnailType ?? null,
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

  async resolveReportFlag(
    flagId: number,
    adminId: number,
    dto: ResolveReportFlagDto,
    ipAddress?: string,
  ): Promise<ReportFlagResponseDto> {
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

      await this.adminActionsAuditRepository.recordAction(
        {
          adminId,
          actionType: 'resolve_flag',
          targetType: 'flag',
          targetId: flagId,
          details: {
            previousStatus: existing.status,
            newStatus: dto.status,
          },
          ipAddress,
        },
        conn,
      );

      return this.mapFlagRecordToResponse(updated);
    });
  }

  async removeReport(reportId: number, adminId: number, ipAddress?: string): Promise<void> {
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
      await this.adminActionsAuditRepository.recordAction(
        {
          adminId,
          actionType: 'delete_report',
          targetType: 'report',
          targetId: reportId,
          details: {
            previousStatus: existing.status,
            note: 'Removed by admin',
          },
          ipAddress,
        },
        conn,
      );
    });
  }

  async listCategories(): Promise<CategoryResponseDto[]> {
    const rows = await this.adminRepository.listCategories();
    return rows.map((row) => this.mapCategory(row));
  }

  async createCategory(
    payload: CreateCategoryDto,
    adminId: number,
    ipAddress?: string,
  ): Promise<CategoryResponseDto> {
    const row = await this.adminRepository.createCategory(payload);
    if (!row) {
      throw new NotFoundException('No se pudo crear la categoría');
    }

    const category = this.mapCategory(row);
    await this.adminActionsAuditRepository.recordAction({
      adminId,
      actionType: 'create_category',
      targetType: 'category',
      targetId: category.id,
      details: {
        name: category.name,
        slug: category.slug,
        isActive: category.is_active,
      },
      ipAddress,
    });

    return category;
  }

  async updateCategory(
    id: number,
    payload: UpdateCategoryDto,
    adminId: number,
    ipAddress?: string,
  ): Promise<CategoryResponseDto> {
    const row = await this.adminRepository.updateCategory(id, payload);
    if (!row) {
      throw new NotFoundException('Categoría no encontrada');
    }

    const category = this.mapCategory(row);
    const changes = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    );
    await this.adminActionsAuditRepository.recordAction({
      adminId,
      actionType: 'update_category',
      targetType: 'category',
      targetId: category.id,
      details: {
        changes,
      },
      ipAddress,
    });

    return category;
  }

  async blockUser(userId: number, adminId: number, payload: BlockUserDto, ipAddress?: string): Promise<void> {
    const updated = await this.adminRepository.blockUser(userId, adminId, payload.reason);
    if (!updated) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.adminActionsAuditRepository.recordAction({
      adminId,
      actionType: 'block_user',
      targetType: 'user',
      targetId: userId,
      details: { reason: payload.reason ?? null },
      ipAddress,
    });
  }

  async unblockUser(userId: number, adminId: number, ipAddress?: string): Promise<void> {
    const updated = await this.adminRepository.unblockUser(userId, adminId);
    if (!updated) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.adminActionsAuditRepository.recordAction({
      adminId,
      actionType: 'unblock_user',
      targetType: 'user',
      targetId: userId,
      ipAddress,
    });
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

  async listAdmins(): Promise<GetAdminsResponseDto> {
    const rows = await this.adminRepository.listAdmins();

    let adminsCount = 0;
    let superadminsCount = 0;

    const items: AdminListItemDto[] = rows.map((row) => {
      const role = row.role as 'admin' | 'superadmin';
      if (role === 'admin') adminsCount++;
      if (role === 'superadmin') superadminsCount++;

      return {
        id: Number(row.id),
        email: String(row.email),
        username: String(row.username),
        fullName: `${row.first_name} ${row.last_name}`.trim(),
        role,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
        lastLoginAt: row.last_login_at ? (row.last_login_at instanceof Date ? row.last_login_at.toISOString() : String(row.last_login_at)) : null,
      };
    });

    return {
      items,
      meta: {
        total: items.length,
        admins: adminsCount,
        superadmins: superadminsCount,
      },
    };
  }

  async promoteUserToAdmin(userId: number, promotedBy: number, dto: PromoteUserDto, ipAddress?: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.role !== 'user') {
      throw new BadRequestException('Solo se pueden promover usuarios regulares');
    }

    const updated = await this.adminRepository.promoteUserToAdmin(userId);
    if (!updated) {
      throw new BadRequestException('No se pudo promover al usuario');
    }

    // Registrar en auditoría de promociones
    await this.adminActionsAuditRepository.recordPromotion({
      userId,
      promotedBy,
      fromRole: 'user',
      toRole: 'admin',
      reason: dto.reason,
    });

    // Registrar acción en auditoría general
    await this.adminActionsAuditRepository.recordAction({
      adminId: promotedBy,
      actionType: 'promote_user',
      targetType: 'user',
      targetId: userId,
      details: { reason: dto.reason },
      ipAddress,
    });
  }

  async demoteAdminToUser(userId: number, demotedBy: number, dto: DemoteUserDto, ipAddress?: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.role !== 'admin') {
      throw new BadRequestException('Solo se pueden degradar administradores regulares');
    }

    const updated = await this.adminRepository.demoteAdminToUser(userId);
    if (!updated) {
      throw new BadRequestException('No se pudo degradar al administrador');
    }

    // Registrar en auditoría de promociones
    await this.adminActionsAuditRepository.recordPromotion({
      userId,
      promotedBy: demotedBy,
      fromRole: 'admin',
      toRole: 'user',
      reason: dto.reason,
    });

    // Registrar acción en auditoría general
    await this.adminActionsAuditRepository.recordAction({
      adminId: demotedBy,
      actionType: 'demote_user',
      targetType: 'user',
      targetId: userId,
      details: { reason: dto.reason },
      ipAddress,
    });
  }

  async getAuditLogs(query: GetAuditLogsQueryDto): Promise<GetAuditLogsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const { items, total } = await this.adminActionsAuditRepository.listAuditLogs({
      adminId: query.adminId,
      actionType: query.actionType as any,
      targetType: query.targetType as any,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      limit,
      offset,
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        adminId: item.admin_id,
        adminEmail: item.admin_email ?? null,
        adminName: item.admin_name ?? null,
        actionType: item.action_type,
        targetType: item.target_type,
        targetId: item.target_id,
        details: this.parseAuditDetails(item.details),
        ipAddress: item.ip_address,
        createdAt: item.created_at.toISOString(),
        admin: {
          id: item.admin_id,
          email: item.admin_email ?? null,
          fullName: item.admin_name?.trim()
            ? item.admin_name.trim()
            : item.admin_email ?? `Admin #${item.admin_id}`,
        },
      })),
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  private parseAuditDetails(details: unknown): Record<string, unknown> | null {
    if (!details) {
      return null;
    }
    if (typeof details === 'object' && details != null && Buffer.isBuffer(details)) {
      const text = details.toString('utf8');
      return this.parseAuditDetails(text);
    }
    if (typeof details === 'object') {
      return details as Record<string, unknown>;
    }
    if (typeof details === 'string') {
      try {
        return JSON.parse(details) as Record<string, unknown>;
      } catch {
        return { raw: details };
      }
    }
    return { raw: details };
  }
}



