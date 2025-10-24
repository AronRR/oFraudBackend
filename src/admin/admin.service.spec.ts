import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { ReportRepository } from 'src/reports/report.repository';
import { ReportFlagRepository } from 'src/reports/report-flag.repository';
import { GetAdminReportsQueryDto } from './dto/get-admin-reports-query.dto';

describe('AdminService', () => {
  let service: AdminService;
  let getTopHostsMock: jest.Mock;
  let findReportsForAdminMock: jest.Mock;
  let withTransactionMock: jest.Mock;

  beforeEach(() => {
    getTopHostsMock = jest.fn();
    findReportsForAdminMock = jest.fn();
    withTransactionMock = jest.fn();

    const adminRepository = {
      getTopHosts: getTopHostsMock,
    } as unknown as AdminRepository;

    const reportRepository = {
      findReportsForAdmin: findReportsForAdminMock,
      withTransaction: withTransactionMock,
    } as unknown as ReportRepository;

    const reportFlagRepository = {} as unknown as ReportFlagRepository;

    service = new AdminService(adminRepository, reportRepository, reportFlagRepository);
  });

  describe('getTopHosts', () => {
    it('maps repository rows to MetricsTopHostDto entries', async () => {
      getTopHostsMock.mockResolvedValueOnce([
        {
          host: 'example.com',
          reportsCount: '7',
          approvedReportsCount: 5,
          pendingReportsCount: 1,
          rejectedReportsCount: 0,
          removedReportsCount: null,
        },
      ]);

      const result = await service.getTopHosts(3);

      expect(getTopHostsMock).toHaveBeenCalledWith(3);
      expect(result).toEqual([
        {
          host: 'example.com',
          reportsCount: 7,
          approvedReportsCount: 5,
          pendingReportsCount: 1,
          rejectedReportsCount: 0,
          removedReportsCount: 0,
        },
      ]);
    });

    it('uses default limit when not provided', async () => {
      getTopHostsMock.mockResolvedValueOnce([]);

      await service.getTopHosts();

      expect(getTopHostsMock).toHaveBeenCalledWith(5);
    });
  });

  describe('listReports', () => {
    it('requests reports with pagination data and maps response', async () => {
      const query: GetAdminReportsQueryDto = {
        page: 2,
        limit: 3,
        status: 'approved',
      };

      const createdAt = new Date('2024-01-01T00:00:00.000Z');
      const updatedAt = new Date('2024-01-02T00:00:00.000Z');
      const reviewedAt = new Date('2024-01-03T00:00:00.000Z');
      const publishedAt = new Date('2024-01-04T00:00:00.000Z');

      findReportsForAdminMock.mockResolvedValueOnce({
        items: [
          {
            reportId: 11,
            title: 'Sample report',
            status: 'approved',
            categoryId: 5,
            categoryName: 'Security',
            authorId: 7,
            authorEmail: 'author@example.com',
            authorName: 'Author Name',
            reviewerId: 9,
            reviewerName: 'Reviewer Name',
            thumbnailUrl: 'http://localhost:3000/public/uploads/test.jpg',
            thumbnailType: 'image',
            createdAt,
            updatedAt,
            reviewedAt,
            publishedAt,
            reviewNotes: 'Notes',
            rejectionReasonText: null,
          },
        ],
        total: 1,
      });

      const result = await service.listReports(query);

      expect(findReportsForAdminMock).toHaveBeenCalledWith({
        status: 'approved',
        limit: 3,
        offset: 3,
      });
      expect(result).toEqual({
        items: [
          {
            reportId: 11,
            title: 'Sample report',
            status: 'approved',
            categoryId: 5,
            categoryName: 'Security',
            author: {
              id: 7,
              email: 'author@example.com',
              name: 'Author Name',
            },
            reviewer: {
              id: 9,
              name: 'Reviewer Name',
            },
            thumbnailUrl: 'http://localhost:3000/public/uploads/test.jpg',
            thumbnailType: 'image',
            createdAt: createdAt.toISOString(),
            updatedAt: updatedAt.toISOString(),
            reviewedAt: reviewedAt.toISOString(),
            publishedAt: publishedAt.toISOString(),
            reviewNotes: 'Notes',
            rejectionReasonText: null,
          },
        ],
        meta: {
          page: 2,
          limit: 3,
          total: 1,
        },
      });
    });

    it('uses default pagination when query does not include page or limit', async () => {
      findReportsForAdminMock.mockResolvedValueOnce({
        items: [],
        total: 0,
      });

      await service.listReports({} as GetAdminReportsQueryDto);

      expect(findReportsForAdminMock).toHaveBeenCalledWith({
        status: undefined,
        limit: 20,
        offset: 0,
      });
    });
  });
});
