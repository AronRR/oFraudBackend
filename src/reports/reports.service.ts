/* eslint-disable prettier/prettier */

import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { UserRole } from 'src/auth/tokens.service';
import { extractHostFromUrl } from 'src/util/url.util';
import { ReportRepository, ReportStatus, type FindApprovedReportsSort } from './report.repository';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { AddMediaDto } from './dto/add-media.dto';
import { GetReportsQueryDto, ReportsFeedSort } from './dto/get-reports-query.dto';
import { GetReportsResponseDto } from './dto/get-reports-response.dto';
import { GetMyReportsQueryDto } from './dto/get-my-reports-query.dto';
import { GetMyReportsResponseDto } from './dto/get-my-reports-response.dto';
import { RejectionReasonRepository } from './rejection-reason.repository';

interface UserContext {
  userId: number;
  role?: UserRole;
}

@Injectable()
export class ReportsService {
  private readonly MAX_MEDIA_PER_REVISION = 5;

  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly rejectionReasonRepository: RejectionReasonRepository,
  ) {}

  async getApprovedReports(query: GetReportsQueryDto): Promise<GetReportsResponseDto> {
    const sortKey = query.sort ?? ReportsFeedSort.RECENT;
    const sortMap: Record<ReportsFeedSort, FindApprovedReportsSort> = {
      [ReportsFeedSort.RECENT]: 'recent',
      [ReportsFeedSort.RATING]: 'rating',
      [ReportsFeedSort.POPULAR]: 'popular',
    };

    const { feed, topHosts } = await this.reportRepository.findApprovedReports({
      categoryId: query.categoryId,
      host: query.host,
      search: query.search,
      sort: sortMap[sortKey],
    });

    return {
      feed: feed.map((report) => ({
        reportId: report.reportId,
        categoryId: report.categoryId,
        categoryName: report.categoryName,
        categorySlug: report.categorySlug,
        title: report.title,
        description: report.description,
        incidentUrl: report.incidentUrl,
        publisherHost: report.publisherHost,
        ratingAverage: report.ratingAverage ? Number(report.ratingAverage) : 0,
        ratingCount: report.ratingCount,
        publishedAt: report.publishedAt ? new Date(report.publishedAt).toISOString() : null,
        approvedAt: report.approvedAt ? new Date(report.approvedAt).toISOString() : null,
      })),
      insights: {
        topHosts: topHosts.map((item) => ({
          host: item.host,
          reportCount: item.reportCount,
          averageRating: item.averageRating != null ? Number(item.averageRating) : null,
          totalRatings: item.totalRatings,
        })),
      },
    };
  }

  async getMyReports(user: UserContext, query: GetMyReportsQueryDto): Promise<GetMyReportsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    const { items, total } = await this.reportRepository.findReportsByAuthor({
      authorId: user.userId,
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
        createdAt: item.createdAt.toISOString(),
        lastEditedAt: item.lastEditedAt ? item.lastEditedAt.toISOString() : null,
        updatedAt: item.updatedAt.toISOString(),
      })),
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async createReport(user: UserContext, dto: CreateReportDto): Promise<{ reportId: number; revisionId: number }> {
    const isAnonymous = dto.isAnonymous ?? false;
    const publisherHost = dto.publisherHost ?? extractHostFromUrl(dto.incidentUrl) ?? null;

    return this.reportRepository.withTransaction(async (conn) => {
      const reportId = await this.reportRepository.createReport(conn, {
        authorId: user.userId,
        categoryId: dto.categoryId,
        isAnonymous,
      });

      const revisionId = await this.reportRepository.createRevision(conn, {
        reportId,
        title: dto.title ?? null,
        description: dto.description,
        incidentUrl: dto.incidentUrl,
        publisherHost: publisherHost ?? '',
        isAnonymous,
        createdBy: user.userId,
        versionNumber: 1,
      });

      await this.reportRepository.updateReportCurrentRevision(conn, reportId, revisionId);
      await this.reportRepository.appendStatusHistory(conn, {
        reportId,
        fromStatus: null,
        toStatus: 'pending',
        changedBy: user.userId,
      });

      return { reportId, revisionId };
    });
  }

  async updateReport(reportId: number, user: UserContext, dto: UpdateReportDto): Promise<{ revisionId: number }> {
    return this.reportRepository.withTransaction(async (conn) => {
      const report = await this.reportRepository.findReportForUpdate(reportId, conn);
      if (!report) {
        throw new NotFoundException('Report not found');
      }
      if (report.author_id !== user.userId) {
        throw new ForbiddenException('You cannot edit this report');
      }
      if (report.status !== 'pending') {
        throw new BadRequestException('Approved or rejected reports cannot be edited');
      }

      const nextVersion = await this.reportRepository.getNextRevisionNumber(reportId, conn);
      const isAnonymous = dto.isAnonymous ?? Boolean(report.is_anonymous);
      const publisherHost = dto.publisherHost ?? extractHostFromUrl(dto.incidentUrl) ?? null;

      const revisionId = await this.reportRepository.createRevision(conn, {
        reportId,
        title: dto.title ?? null,
        description: dto.description,
        incidentUrl: dto.incidentUrl,
        publisherHost: publisherHost ?? '',
        isAnonymous,
        createdBy: user.userId,
        versionNumber: nextVersion,
      });

      await this.reportRepository.updateReportCurrentRevision(conn, reportId, revisionId);

      return { revisionId };
    });
  }

  async addMediaToRevision(user: UserContext, dto: AddMediaDto): Promise<{ mediaId: number }> {
    return this.reportRepository.withTransaction(async (conn) => {
      const revision = await this.reportRepository.findRevisionById(dto.revisionId, conn);
      if (!revision) {
        throw new NotFoundException('Revision not found');
      }
      if (revision.report_author_id !== user.userId) {
        throw new ForbiddenException('You cannot modify this revision');
      }
      if (revision.report_status !== 'pending') {
        throw new BadRequestException('Media can only be added while report is pending');
      }

      const currentCount = await this.reportRepository.countMediaForRevision(dto.revisionId, conn);
      if (currentCount >= this.MAX_MEDIA_PER_REVISION) {
        throw new BadRequestException('Maximum number of media items reached');
      }

      const position = dto.position ?? currentCount + 1;
      if (position > this.MAX_MEDIA_PER_REVISION) {
        throw new BadRequestException('Media position exceeds allowed range');
      }

      const mediaId = await this.reportRepository.insertMedia(conn, {
        revisionId: dto.revisionId,
        fileUrl: dto.fileUrl,
        storageKey: dto.storageKey ?? null,
        mediaType: dto.mediaType ?? 'image',
        position,
      });

      return { mediaId };
    });
  }

  async moderateReport(admin: UserContext, payload: {
    action: 'approve' | 'reject';
    reportId: number;
    revisionId?: number;
    rejectionReasonId?: number;
    rejectionReasonCode?: string | null;
    rejectionReasonText?: string | null;
    note?: string | null;
  }): Promise<void> {
    if (admin.role !== 'admin') {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.reportRepository.withTransaction(async (conn) => {
      const report = await this.reportRepository.findReportForUpdate(payload.reportId, conn);
      if (!report) {
        throw new NotFoundException('Report not found');
      }

      const previousStatus = report.status;
      if (previousStatus === 'removed') {
        throw new BadRequestException('Removed reports cannot change status');
      }

      const approvalRevisionId = payload.revisionId ?? report.current_revision_id;
      if (!approvalRevisionId) {
        throw new BadRequestException('No revision selected for moderation');
      }

      if (payload.action === 'approve') {
        if (previousStatus === 'approved') {
          throw new BadRequestException('Report is already approved');
        }

        await this.reportRepository.updateReportStatus(conn, {
          reportId: payload.reportId,
          status: 'approved',
          reviewerId: admin.userId,
          reviewNotes: payload.note ?? null,
          lock: true,
          approvedAt: new Date(),
          publishedAt: new Date(),
        });
        await this.reportRepository.updateReportCurrentRevision(conn, payload.reportId, approvalRevisionId);
        await this.reportRepository.appendStatusHistory(conn, {
          reportId: payload.reportId,
          fromStatus: previousStatus as ReportStatus,
          toStatus: 'approved',
          changedBy: admin.userId,
          note: payload.note ?? null,
        });
        return;
      }

      if (previousStatus === 'rejected') {
        throw new BadRequestException('Report is already rejected');
      }

      const reasonRecord = payload.rejectionReasonId
        ? await this.rejectionReasonRepository.findById(payload.rejectionReasonId)
        : payload.rejectionReasonCode
        ? await this.rejectionReasonRepository.findByCode(payload.rejectionReasonCode)
        : undefined;

      const rejectionReasonId = reasonRecord?.id ?? payload.rejectionReasonId ?? null;
      const rejectionReasonCode = reasonRecord?.code ?? payload.rejectionReasonCode ?? null;
      const rejectionReasonText = payload.rejectionReasonText ?? reasonRecord?.label ?? null;

      await this.reportRepository.updateReportStatus(conn, {
        reportId: payload.reportId,
        status: 'rejected',
        reviewerId: admin.userId,
        reviewNotes: payload.note ?? null,
        rejectionReasonId,
        rejectionReasonText,
        lock: true,
      });
      await this.reportRepository.updateReportCurrentRevision(conn, payload.reportId, approvalRevisionId);
      await this.reportRepository.appendStatusHistory(conn, {
        reportId: payload.reportId,
        fromStatus: previousStatus as ReportStatus,
        toStatus: 'rejected',
        changedBy: admin.userId,
        rejectionReasonId,
        rejectionReasonCode,
        rejectionReasonText,
        note: payload.note ?? null,
      });
    });
  }

  async deleteReport(reportId: number, user: UserContext): Promise<void> {
    await this.reportRepository.withTransaction(async (conn) => {
      const report = await this.reportRepository.findReportForUpdate(reportId, conn);
      if (!report) {
        throw new NotFoundException('Report not found');
      }
      if (report.author_id !== user.userId) {
        throw new ForbiddenException('You cannot delete this report');
      }
      if (report.status !== 'pending') {
        throw new BadRequestException('Only pending reports can be deleted');
      }

      await this.reportRepository.softDeleteReport(conn, reportId);
      await this.reportRepository.appendStatusHistory(conn, {
        reportId,
        fromStatus: report.status,
        toStatus: 'removed',
        changedBy: user.userId,
      });
    });
  }
}
