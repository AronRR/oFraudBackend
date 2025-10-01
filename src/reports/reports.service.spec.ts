import { NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import type { ReportRepository, ApprovedReportWithRelationsRow, ReportMediaRow } from './report.repository';
import type { RejectionReasonRepository } from './rejection-reason.repository';
import type { ReportRatingRepository } from './report-rating.repository';
import type { ReportCommentRepository } from './report-comment.repository';
import type { ReportFlagRepository } from './report-flag.repository';

const createReportRepositoryMock = () =>
  ({
    findApprovedReportWithRelations: jest.fn(),
    listMediaByRevision: jest.fn(),
  }) as jest.Mocked<Pick<ReportRepository, 'findApprovedReportWithRelations' | 'listMediaByRevision'>>;

describe('ReportsService - getApprovedReportDetail', () => {
  let reportRepository: jest.Mocked<Pick<
    ReportRepository,
    'findApprovedReportWithRelations' | 'listMediaByRevision'
  >>;
  let service: ReportsService;

  beforeEach(() => {
    reportRepository = createReportRepositoryMock();

    service = new ReportsService(
      reportRepository as unknown as ReportRepository,
      {} as RejectionReasonRepository,
      {} as ReportRatingRepository,
      {} as ReportCommentRepository,
      {} as ReportFlagRepository,
    );
  });

  const buildBaseReport = (overrides: Partial<ApprovedReportWithRelationsRow> = {}): ApprovedReportWithRelationsRow => ({
    reportId: 42,
    status: 'approved',
    categoryId: 7,
    categoryName: 'Fraude',
    categorySlug: 'fraude',
    ratingAverage: '4.7500',
    ratingCount: 8,
    publishedAt: new Date('2024-01-03T10:00:00.000Z'),
    approvedAt: new Date('2024-01-02T10:00:00.000Z'),
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    revisionId: 101,
    title: 'Estafa bancaria confirmada',
    description: 'Descripción del incidente.',
    incidentUrl: 'https://example.com/report',
    publisherHost: 'example.com',
    isAnonymous: false,
    authorId: 5,
    authorFirstName: 'María',
    authorLastName: 'Pérez',
    authorUsername: 'maria.perez',
    ...overrides,
  });

  const buildMedia = (overrides: Partial<ReportMediaRow> = {}): ReportMediaRow => ({
    mediaId: 1,
    revisionId: 101,
    fileUrl: 'https://cdn.example.com/image.jpg',
    mediaType: 'image',
    position: 0,
    ...overrides,
  });

  it('should map report detail including media and author display name', async () => {
    const report = buildBaseReport();
    const mediaItems = [buildMedia(), buildMedia({ mediaId: 2, fileUrl: 'https://cdn.example.com/image-2.jpg', position: 1 })];

    reportRepository.findApprovedReportWithRelations.mockResolvedValue(report);
    reportRepository.listMediaByRevision.mockResolvedValue(mediaItems);

    const result = await service.getApprovedReportDetail(report.reportId);

    expect(reportRepository.findApprovedReportWithRelations).toHaveBeenCalledWith(report.reportId);
    expect(reportRepository.listMediaByRevision).toHaveBeenCalledWith(report.revisionId);
    expect(result).toEqual({
      reportId: report.reportId,
      title: report.title,
      description: report.description,
      incidentUrl: report.incidentUrl,
      publisherHost: report.publisherHost,
      createdAt: report.createdAt.toISOString(),
      approvedAt: report.approvedAt?.toISOString() ?? null,
      publishedAt: report.publishedAt?.toISOString() ?? null,
      category: { id: report.categoryId!, name: report.categoryName, slug: report.categorySlug },
      author: { isAnonymous: false, authorId: report.authorId, displayName: 'María Pérez' },
      media: mediaItems.map((item) => ({
        mediaId: item.mediaId,
        fileUrl: item.fileUrl,
        mediaType: item.mediaType,
        position: item.position,
      })),
      ratingAverage: 4.75,
      ratingCount: report.ratingCount,
    });
  });

  it('should fallback to username when names are not available', async () => {
    const report = buildBaseReport({ authorFirstName: '  ', authorLastName: '', authorUsername: 'autor.fallback' });
    reportRepository.findApprovedReportWithRelations.mockResolvedValue(report);
    reportRepository.listMediaByRevision.mockResolvedValue([buildMedia()]);

    const result = await service.getApprovedReportDetail(report.reportId);

    expect(result.author).toEqual({ isAnonymous: false, authorId: report.authorId, displayName: 'autor.fallback' });
  });

  it('should hide author details when report is anonymous', async () => {
    const report = buildBaseReport({ isAnonymous: true });
    reportRepository.findApprovedReportWithRelations.mockResolvedValue(report);
    reportRepository.listMediaByRevision.mockResolvedValue([]);

    const result = await service.getApprovedReportDetail(report.reportId);

    expect(result.author).toEqual({ isAnonymous: true, authorId: null, displayName: null });
  });

  it('should throw NotFound when repository does not return a report', async () => {
    reportRepository.findApprovedReportWithRelations.mockResolvedValue(undefined);

    await expect(service.getApprovedReportDetail(999)).rejects.toBeInstanceOf(NotFoundException);
    expect(reportRepository.listMediaByRevision).not.toHaveBeenCalled();
  });

  it('should throw NotFound when report is not approved', async () => {
    const report = buildBaseReport({ status: 'pending' });
    reportRepository.findApprovedReportWithRelations.mockResolvedValue(report);

    await expect(service.getApprovedReportDetail(report.reportId)).rejects.toBeInstanceOf(NotFoundException);
    expect(reportRepository.listMediaByRevision).not.toHaveBeenCalled();
  });
});
