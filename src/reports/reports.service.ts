/* eslint-disable prettier/prettier */

import { Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import type { UserRole } from 'src/auth/tokens.service';
import { extractHostFromUrl } from 'src/util/url.util';
import { ReportRepository, ReportStatus, type FindApprovedReportsSort } from './report.repository';
import { ReportRatingRepository, type ReportRatingRecord } from './report-rating.repository';
import { ReportCommentRepository, type ReportCommentRecord } from './report-comment.repository';
import { ReportFlagRepository, type ReportFlagRecord } from './report-flag.repository';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { GetReportsQueryDto, ReportsFeedSort } from './dto/get-reports-query.dto';
import { GetReportsResponseDto } from './dto/get-reports-response.dto';
import { GetMyReportsQueryDto } from './dto/get-my-reports-query.dto';
import { GetMyReportsResponseDto } from './dto/get-my-reports-response.dto';
import { RejectionReasonRepository } from './rejection-reason.repository';
import { CreateReportRatingDto } from './dto/create-report-rating.dto';
import { UpdateReportRatingDto } from './dto/update-report-rating.dto';
import { ReportRatingResponseDto, ReportRatingSummaryDto } from './dto/report-rating-response.dto';
import { CreateReportCommentDto } from './dto/create-report-comment.dto';
import { UpdateReportCommentDto } from './dto/update-report-comment.dto';
import { GetReportCommentsQueryDto } from './dto/get-report-comments-query.dto';
import { GetReportCommentsResponseDto, ReportCommentDto } from './dto/get-report-comments-response.dto';
import { CreateReportFlagDto } from './dto/create-report-flag.dto';
import { ReportFlagResponseDto } from './dto/report-flag-response.dto';
import { ReportDetailDto } from './dto/report-detail.dto';

interface UserContext {
  userId: number;
  role?: UserRole;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly MAX_MEDIA_PER_REVISION = 5;

  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly rejectionReasonRepository: RejectionReasonRepository,
    private readonly reportRatingRepository: ReportRatingRepository,
    private readonly reportCommentRepository: ReportCommentRepository,
    private readonly reportFlagRepository: ReportFlagRepository,
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

  async getApprovedReportDetail(reportId: number): Promise<ReportDetailDto> {
    const report = await this.reportRepository.findApprovedReportWithRelations(reportId);

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== 'approved') {
      throw new NotFoundException('Report is not approved');
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

    const author = report.isAnonymous
      ? { isAnonymous: true, authorId: null, displayName: null }
      : {
          isAnonymous: false,
          authorId: report.authorId,
          displayName: displayName || null,
        };

    return {
      reportId: report.reportId,
      title: report.title ?? null,
      description: report.description,
      incidentUrl: report.incidentUrl,
      publisherHost: report.publisherHost,
      createdAt: report.createdAt.toISOString(),
      approvedAt: report.approvedAt ? report.approvedAt.toISOString() : null,
      publishedAt: report.publishedAt ? report.publishedAt.toISOString() : null,
      category,
      author,
      media: media.map((item) => ({
        mediaId: item.mediaId,
        fileUrl: item.fileUrl,
        mediaType: item.mediaType ?? null,
        position: item.position,
      })),
      ratingAverage: report.ratingAverage != null ? Number(report.ratingAverage) : 0,
      ratingCount: report.ratingCount,
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
    if (!dto.media || dto.media.length === 0) {
      throw new BadRequestException('At least one media item is required');
    }
    if (dto.media.length > this.MAX_MEDIA_PER_REVISION) {
      throw new BadRequestException('Too many media items');
    }

    const normalizedMedia = dto.media.map((item, index) => ({
      fileUrl: item.fileUrl,
      mediaType: item.mediaType,
      position: item.position ?? index + 1,
    }));

    const hasInvalidPosition = normalizedMedia.some(
      (item) => item.position < 1 || item.position > this.MAX_MEDIA_PER_REVISION,
    );
    if (hasInvalidPosition) {
      throw new BadRequestException('Media position exceeds allowed range');
    }

    const uniquePositions = new Set(normalizedMedia.map((item) => item.position));
    if (uniquePositions.size !== normalizedMedia.length) {
      throw new BadRequestException('Duplicate media positions are not allowed');
    }

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

      for (const mediaItem of normalizedMedia) {
        await this.reportRepository.insertMedia(conn, {
          revisionId,
          fileUrl: mediaItem.fileUrl,
          storageKey: null,
          mediaType: mediaItem.mediaType,
          position: mediaItem.position,
        });
      }

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

  async createReportRating(
    reportId: number,
    user: UserContext,
    dto: CreateReportRatingDto,
  ): Promise<ReportRatingResponseDto> {
    return this.reportRepository.withTransaction(async (conn) => {
      const report = await this.reportRepository.findReportForUpdate(reportId, conn);
      if (!report || report.status !== 'approved') {
        throw new NotFoundException('Report not available for ratings');
      }

      // Prevent self-rating
      if (report.author_id === user.userId) {
        throw new BadRequestException('No puedes calificar tu propio reporte');
      }

      const existing = await this.reportRatingRepository.findByReportAndUser(reportId, user.userId, conn);
      if (existing) {
        throw new BadRequestException('You have already rated this report');
      }

      const ratingId = await this.reportRatingRepository.insertRating(conn, {
        reportId,
        userId: user.userId,
        score: dto.score,
        comment: dto.comment ?? null,
      });

      const rating = await this.reportRatingRepository.findById(ratingId, conn);
      if (!rating) {
        throw new NotFoundException('Rating not found after creation');
      }

      const summary = await this.reportRepository.recalculateRatingSummary(conn, reportId);

      this.logger.log(`User ${user.userId} rated report ${reportId} with score ${rating.score}`);

      return this.mapRatingRecordToResponse(rating, summary);
    });
  }

  async updateReportRating(
    reportId: number,
    ratingId: number,
    user: UserContext,
    dto: UpdateReportRatingDto,
  ): Promise<ReportRatingResponseDto> {
    return this.reportRepository.withTransaction(async (conn) => {
      const report = await this.reportRepository.findReportForUpdate(reportId, conn);
      if (!report || report.status !== 'approved') {
        throw new NotFoundException('Report not available for ratings');
      }

      const existing = await this.reportRatingRepository.findById(ratingId, conn);
      if (!existing || existing.report_id !== reportId) {
        throw new NotFoundException('Rating not found');
      }

      if (existing.user_id !== user.userId && user.role !== 'admin') {
        throw new ForbiddenException('You cannot modify this rating');
      }

      const payload: { score?: number; comment?: string | null } = {};
      if (dto.score != null) {
        payload.score = dto.score;
      }
      if (Object.prototype.hasOwnProperty.call(dto, 'comment')) {
        payload.comment = dto.comment ?? null;
      }

      if (!Object.keys(payload).length) {
        throw new BadRequestException('No changes provided');
      }

      await this.reportRatingRepository.updateRating(conn, ratingId, payload);

      const rating = await this.reportRatingRepository.findById(ratingId, conn);
      if (!rating) {
        throw new NotFoundException('Rating not found after update');
      }

      const summary = await this.reportRepository.recalculateRatingSummary(conn, reportId);

      this.logger.log(`User ${user.userId} updated rating ${ratingId} on report ${reportId}`);

      return this.mapRatingRecordToResponse(rating, summary);
    });
  }

  async deleteReportRating(
    reportId: number,
    ratingId: number,
    user: UserContext,
  ): Promise<{ summary: ReportRatingSummaryDto }> {
    return this.reportRepository.withTransaction(async (conn) => {
      const report = await this.reportRepository.findReportForUpdate(reportId, conn);
      if (!report || report.status !== 'approved') {
        throw new NotFoundException('Report not available for ratings');
      }

      const existing = await this.reportRatingRepository.findById(ratingId, conn);
      if (!existing || existing.report_id !== reportId) {
        throw new NotFoundException('Rating not found');
      }

      if (existing.user_id !== user.userId && user.role !== 'admin') {
        throw new ForbiddenException('You cannot delete this rating');
      }

      await this.reportRatingRepository.deleteRating(conn, ratingId);
      const summary = await this.reportRepository.recalculateRatingSummary(conn, reportId);

      this.logger.log(`User ${user.userId} deleted rating ${ratingId} on report ${reportId}`);

      return { summary };
    });
  }

  async createReportFlag(
    reportId: number,
    user: UserContext,
    dto: CreateReportFlagDto,
  ): Promise<ReportFlagResponseDto> {
    const report = await this.reportRepository.findReportById(reportId);
    if (!report || report.status !== 'approved') {
      throw new NotFoundException('Report not available for community flags');
    }

    const detailsRaw = dto.details ? dto.details.trim() : null;
    const sanitizedDetails = detailsRaw && detailsRaw.length > 0 ? detailsRaw : null;

    const existing = await this.reportFlagRepository.findByUnique(reportId, user.userId, dto.reasonCode);
    if (existing) {
      throw new ConflictException('Ya registraste una alerta con este motivo para este reporte');
    }

    try {
      return await this.reportRepository.withTransaction(async (conn) => {
        const flagId = await this.reportFlagRepository.insertFlag(conn, {
          reportId,
          userId: user.userId,
          reason: dto.reasonCode,
          details: sanitizedDetails,
        });

        const record = await this.reportFlagRepository.findById(flagId, conn);
        if (!record) {
          throw new NotFoundException('Flag not found after creation');
        }

        this.logger.log('User ' + user.userId + ' flagged report ' + reportId + ' reason ' + dto.reasonCode);

        return this.mapFlagRecordToResponse(record);
      });
    } catch (error) {
      if (this.isDuplicateEntryError(error)) {
        throw new ConflictException('Ya registraste una alerta con este motivo para este reporte');
      }
      throw error;
    }
  }

  async createReportComment(
    reportId: number,
    user: UserContext,
    dto: CreateReportCommentDto,
  ): Promise<ReportCommentDto> {
    return this.reportRepository.withTransaction(async (conn) => {
      const report = await this.reportRepository.findReportForUpdate(reportId, conn);
      if (!report || report.status !== 'approved') {
        throw new NotFoundException('Report not available for comments');
      }

      let parentCommentId: number | null = null;
      if (dto.parentCommentId) {
        const parent = await this.reportCommentRepository.findById(dto.parentCommentId, conn);
        if (!parent || parent.report_id !== reportId || parent.status !== 'visible' || parent.deleted_at) {
          throw new BadRequestException('Parent comment is not available');
        }
        parentCommentId = parent.id;
      }

      const commentId = await this.reportCommentRepository.insertComment(conn, {
        reportId,
        userId: user.userId,
        parentCommentId,
        content: dto.content,
      });

      const comment = await this.reportCommentRepository.findById(commentId, conn);
      if (!comment) {
        throw new NotFoundException('Comment not found after creation');
      }

      this.logger.log(`User ${user.userId} commented on report ${reportId}`);

      return this.mapCommentRecordToDto(comment);
    });
  }

  async updateReportComment(
    reportId: number,
    commentId: number,
    user: UserContext,
    dto: UpdateReportCommentDto,
  ): Promise<ReportCommentDto> {
    return this.reportRepository.withTransaction(async (conn) => {
      const report = await this.reportRepository.findReportForUpdate(reportId, conn);
      if (!report || report.status !== 'approved') {
        throw new NotFoundException('Report not available for comments');
      }

      const existing = await this.reportCommentRepository.findById(commentId, conn);
      if (!existing || existing.report_id !== reportId || existing.status !== 'visible' || existing.deleted_at) {
        throw new NotFoundException('Comment not found');
      }

      if (existing.user_id !== user.userId && user.role !== 'admin') {
        throw new ForbiddenException('You cannot modify this comment');
      }

      await this.reportCommentRepository.updateComment(conn, commentId, dto.content);

      const updated = await this.reportCommentRepository.findById(commentId, conn);
      if (!updated) {
        throw new NotFoundException('Comment not found after update');
      }

      this.logger.log(`User ${user.userId} updated comment ${commentId} on report ${reportId}`);

      return this.mapCommentRecordToDto(updated);
    });
  }

  async deleteReportComment(
    reportId: number,
    commentId: number,
    user: UserContext,
  ): Promise<{ success: true }> {
    return this.reportRepository.withTransaction(async (conn) => {
      const report = await this.reportRepository.findReportForUpdate(reportId, conn);
      if (!report || report.status !== 'approved') {
        throw new NotFoundException('Report not available for comments');
      }

      const existing = await this.reportCommentRepository.findById(commentId, conn);
      if (!existing || existing.report_id !== reportId || existing.deleted_at) {
        throw new NotFoundException('Comment not found');
      }

      if (existing.user_id !== user.userId && user.role !== 'admin') {
        throw new ForbiddenException('You cannot delete this comment');
      }

      await this.reportCommentRepository.softDeleteComment(conn, commentId);

      this.logger.log(`User ${user.userId} deleted comment ${commentId} on report ${reportId}`);

      return { success: true as const };
    });
  }

  async getReportComments(
    reportId: number,
    query: GetReportCommentsQueryDto,
  ): Promise<GetReportCommentsResponseDto> {
    const report = await this.reportRepository.findReportById(reportId);
    if (!report || report.status !== 'approved') {
      throw new NotFoundException('Report not available for comments');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const { items, total } = await this.reportCommentRepository.listVisibleComments(reportId, {
      limit,
      offset,
    });

    return {
      items: items.map((item) => this.mapCommentRecordToDto(item)),
      meta: {
        page,
        limit,
        total,
      },
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

  private isDuplicateEntryError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'ER_DUP_ENTRY'
    );
  }

  private mapRatingRecordToResponse(
    record: ReportRatingRecord,
    summary: { average: number; count: number },
  ): ReportRatingResponseDto {
    return {
      ratingId: record.id,
      reportId: record.report_id,
      userId: record.user_id,
      score: record.score,
      comment: record.comment,
      createdAt: record.created_at.toISOString(),
      updatedAt: record.updated_at.toISOString(),
      summary: {
        average: summary.average,
        count: summary.count,
      },
    };
  }

  private mapCommentRecordToDto(record: ReportCommentRecord): ReportCommentDto {
    return {
      commentId: record.id,
      reportId: record.report_id,
      userId: record.user_id,
      parentCommentId: record.parent_comment_id,
      content: record.content,
      createdAt: record.created_at.toISOString(),
      updatedAt: record.updated_at.toISOString(),
    };
  }
}
