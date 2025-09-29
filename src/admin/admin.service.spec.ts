import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';

describe('AdminService', () => {
  let service: AdminService;
  let getTopHostsMock: jest.Mock;

  beforeEach(() => {
    getTopHostsMock = jest.fn();
    const adminRepository = {
      getTopHosts: getTopHostsMock,
    } as unknown as AdminRepository;

    service = new AdminService(adminRepository);
  });

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
