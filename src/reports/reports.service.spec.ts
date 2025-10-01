import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import type {
  ReportRepository,
  ApprovedReportWithRelationsRow,
  ReportMediaRow,
} from './report.repository';
import type { RejectionReasonRepository } from './rejection-reason.repository';
import type { ReportRatingRepository } from './report-rating.repository';
import type { ReportCommentRepository } from './report-comment.repository';
import type { ReportFlagRepository } from './report-flag.repository';

const createReportRepositoryMock = () =>
  ({
    findApprovedReportWithRelations: jest.fn(),
    listMediaByRevision: jest.fn(),
  }) as jest.Mocked<Pick<ReportRepository, 'findApprovedReportWithRelations' | 'listMediaByRevision'>>;

const createReportCreationRepositoryMock = () =>
  ({
    withTransaction: jest.fn(),
    createReport: jest.fn(),
    createRevision: jest.fn(),
    updateReportCurrentRevision: jest.fn(),
    appendStatusHistory: jest.fn(),
    insertMedia: jest.fn(),
  }) as jest.Mocked<
    Pick<
      ReportRepository,
      | 'withTransaction'
      | 'createReport'
      | 'createRevision'
      | 'updateReportCurrentRevision'
      | 'appendStatusHistory'
      | 'insertMedia'
    >
  >;

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

describe('ReportsService - createReport', () => {
  let reportRepository: ReturnType<typeof createReportCreationRepositoryMock>;
  let service: ReportsService;

  beforeEach(() => {
    reportRepository = createReportCreationRepositoryMock();
    service = new ReportsService(
      reportRepository as unknown as ReportRepository,
      {} as RejectionReasonRepository,
      {} as ReportRatingRepository,
      {} as ReportCommentRepository,
      {} as ReportFlagRepository,
    );
  });

  it('should create report with media within a transaction', async () => {
    const mockConnection = Symbol('conn') as unknown as any;
    reportRepository.withTransaction.mockImplementation(async (handler) => handler(mockConnection));
    reportRepository.createReport.mockResolvedValue(10);
    reportRepository.createRevision.mockResolvedValue(20);
    reportRepository.insertMedia.mockResolvedValueOnce(100).mockResolvedValueOnce(101);

    const dto = {
      categoryId: 1,
      description: 'Descripción',
      incidentUrl: 'https://example.com/caso',
      media: [
        { fileUrl: 'https://cdn.example.com/1.jpg', mediaType: 'image' as const },
        { fileUrl: 'https://cdn.example.com/2.mp4', mediaType: 'video' as const, position: 5 },
      ],
    };

    const result = await service.createReport({ userId: 55 }, dto);

    expect(reportRepository.withTransaction).toHaveBeenCalledTimes(1);
    expect(reportRepository.createReport).toHaveBeenCalledWith(mockConnection, {
      authorId: 55,
      categoryId: dto.categoryId,
      isAnonymous: false,
    });
    expect(reportRepository.createRevision).toHaveBeenCalledWith(mockConnection, {
      reportId: 10,
      title: null,
      description: dto.description,
      incidentUrl: dto.incidentUrl,
      publisherHost: 'example.com',
      isAnonymous: false,
      createdBy: 55,
      versionNumber: 1,
    });
    expect(reportRepository.insertMedia).toHaveBeenNthCalledWith(1, mockConnection, {
      revisionId: 20,
      fileUrl: dto.media[0].fileUrl,
      storageKey: null,
      mediaType: 'image',
      position: 1,
    });
    expect(reportRepository.insertMedia).toHaveBeenNthCalledWith(2, mockConnection, {
      revisionId: 20,
      fileUrl: dto.media[1].fileUrl,
      storageKey: null,
      mediaType: 'video',
      position: 5,
    });
    expect(result).toEqual({ reportId: 10, revisionId: 20 });
  });

  it('should throw when media array is empty', async () => {
    const dto = {
      categoryId: 1,
      description: 'Descripción',
      incidentUrl: 'https://example.com/caso',
      media: [],
    };

    await expect(service.createReport({ userId: 1 }, dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(reportRepository.withTransaction).not.toHaveBeenCalled();
  });

  it('should throw when media array exceeds limit', async () => {
    const baseMedia = { fileUrl: 'https://cdn.example.com/file.jpg', mediaType: 'image' as const };
    const dto = {
      categoryId: 1,
      description: 'Descripción',
      incidentUrl: 'https://example.com/caso',
      media: [baseMedia, baseMedia, baseMedia, baseMedia, baseMedia, baseMedia],
    };

    await expect(service.createReport({ userId: 1 }, dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(reportRepository.withTransaction).not.toHaveBeenCalled();
  });
});
