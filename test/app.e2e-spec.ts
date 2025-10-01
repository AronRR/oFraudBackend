import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DbService } from 'src/db/db.service';
import { ReportRepository, ReportStatus, type ReportRecord } from 'src/reports/report.repository';
import { RejectionReasonRepository } from 'src/reports/rejection-reason.repository';
import { TokenService } from 'src/auth/tokens.service';

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key';
}

interface MockUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
}

interface MockReport {
  id: number;
  status: ReportStatus;
  authorId: number;
  categoryId: number;
  currentRevisionId: number | null;
  reviewedBy: number | null;
  reviewedAt: Date | null;
  publishedAt: Date | null;
  reviewNotes: string | null;
  rejectionReasonText: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface MockRevision {
  id: number;
  reportId: number;
  title: string | null;
  createdAt: Date;
}

interface MockCategory {
  id: number;
  name: string;
}

interface MockState {
  users: Map<number, MockUser>;
  reports: Map<number, MockReport>;
  revisions: Map<number, MockRevision>;
  categories: Map<number, MockCategory>;
  history: Array<{ reportId: number; toStatus: ReportStatus }>;
}

const buildMockReportRepository = (state: MockState): ReportRepository => {
  const withTransaction = jest.fn(async <T>(handler: (conn: unknown) => Promise<T>): Promise<T> => {
    return handler({} as unknown);
  });

  const findReportForUpdate = jest.fn(async (reportId: number) => {
    const report = state.reports.get(reportId);
    if (!report) {
      return undefined;
    }

    const record: ReportRecord = {
      id: report.id,
      author_id: report.authorId,
      category_id: report.categoryId,
      current_revision_id: report.currentRevisionId,
      status: report.status,
      reviewed_by: report.reviewedBy,
      reviewed_at: report.reviewedAt,
      approved_at: report.publishedAt,
      review_notes: report.reviewNotes,
      rejection_reason_id: null,
      rejection_reason_text: report.rejectionReasonText,
      is_locked: 0,
      is_anonymous: 0,
      rating_average: '0',
      rating_count: 0,
      published_at: report.publishedAt,
      deleted_at: report.deletedAt,
      created_at: report.createdAt,
      updated_at: report.updatedAt,
    };

    return record;
  });

  const updateReportStatus = jest.fn(
    async (
      _conn: unknown,
      payload: {
        reportId: number;
        status: ReportStatus;
        reviewerId: number;
        reviewNotes?: string | null;
        rejectionReasonId?: number | null;
        rejectionReasonText?: string | null;
        lock?: boolean;
        approvedAt?: Date | null;
        publishedAt?: Date | null;
      },
    ) => {
      const report = state.reports.get(payload.reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      const now = new Date();
      report.status = payload.status;
      report.reviewedBy = payload.reviewerId;
      report.reviewedAt = now;
      report.reviewNotes = payload.reviewNotes ?? null;
      report.rejectionReasonText = payload.rejectionReasonText ?? null;
      report.publishedAt = payload.publishedAt ?? null;
      report.updatedAt = now;
    },
  );

  const updateReportCurrentRevision = jest.fn(async (_conn: unknown, reportId: number, revisionId: number) => {
    const report = state.reports.get(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    report.currentRevisionId = revisionId;
  });

  const appendStatusHistory = jest.fn(
    async (
      _conn: unknown,
      payload: {
        reportId: number;
        toStatus: ReportStatus;
      },
    ) => {
      state.history.push({ reportId: payload.reportId, toStatus: payload.toStatus });
    },
  );

  const softDeleteReport = jest.fn(async (_conn: unknown, reportId: number) => {
    const report = state.reports.get(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const now = new Date();
    report.status = 'removed';
    report.deletedAt = now;
    report.updatedAt = now;
  });

  const findReportsForAdmin = jest.fn(async (params: { status?: ReportStatus; limit: number; offset: number }) => {
    const { status, limit, offset } = params;
    let reports = Array.from(state.reports.values());

    reports = reports.filter((report) => {
      if (status && report.status !== status) {
        return false;
      }
      if (status !== 'removed' && report.deletedAt) {
        return false;
      }
      return true;
    });

    reports.sort((a, b) => {
      const diff = b.updatedAt.getTime() - a.updatedAt.getTime();
      return diff !== 0 ? diff : b.id - a.id;
    });

    const total = reports.length;
    const slice = reports.slice(offset, offset + limit);

    const items = slice.map((report) => {
      const revision = report.currentRevisionId ? state.revisions.get(report.currentRevisionId) : undefined;
      const author = state.users.get(report.authorId);
      const reviewer = report.reviewedBy ? state.users.get(report.reviewedBy) : undefined;
      const category = state.categories.get(report.categoryId);

      return {
        reportId: report.id,
        title: revision?.title ?? null,
        status: report.status,
        categoryId: report.categoryId,
        categoryName: category?.name ?? null,
        authorId: report.authorId,
        authorEmail: author?.email ?? null,
        authorName: author ? `${author.firstName} ${author.lastName}`.trim() : null,
        reviewerId: reviewer?.id ?? null,
        reviewerName: reviewer ? `${reviewer.firstName} ${reviewer.lastName}`.trim() : null,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        reviewedAt: report.reviewedAt,
        publishedAt: report.publishedAt,
        reviewNotes: report.reviewNotes,
        rejectionReasonText: report.rejectionReasonText,
      } as any;
    });

    return { items, total };
  });

  const findReportsByAuthor = jest.fn(
    async (params: { authorId: number; status?: ReportStatus; limit: number; offset: number }) => {
      const { authorId, status, limit, offset } = params;

      let reports = Array.from(state.reports.values()).filter((report) => report.authorId === authorId);

      if (status) {
        reports = reports.filter((report) => report.status === status);
      }

      if (status && status !== 'removed') {
        reports = reports.filter((report) => !report.deletedAt);
      }

      reports.sort((a, b) => {
        const diff = b.updatedAt.getTime() - a.updatedAt.getTime();
        return diff !== 0 ? diff : b.id - a.id;
      });

      const total = reports.length;
      const slice = reports.slice(offset, offset + limit);

      const items = slice.map((report) => {
        const revision = report.currentRevisionId ? state.revisions.get(report.currentRevisionId) : undefined;
        const category = state.categories.get(report.categoryId);

        return {
          reportId: report.id,
          title: revision?.title ?? null,
          status: report.status,
          categoryId: report.categoryId,
          categoryName: category?.name ?? null,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
          lastEditedAt: revision?.createdAt ?? report.updatedAt,
        } as any;
      });

      return { items, total };
    },
  );

  return {
    withTransaction,
    findReportForUpdate,
    updateReportStatus,
    updateReportCurrentRevision,
    appendStatusHistory,
    softDeleteReport,
    findReportsForAdmin,
    findReportsByAuthor,
  } as unknown as ReportRepository;
};

const rejectionReasonRepositoryMock: Partial<RejectionReasonRepository> = {
  findById: jest.fn(async (id: number) => {
    if (id === 1) {
      return { id: 1, code: 'spam', label: 'Contenido promocional no deseado' } as any;
    }
    return undefined;
  }),
  findByCode: jest.fn(async (code: string) => {
    if (code === 'spam') {
      return { id: 1, code: 'spam', label: 'Contenido promocional no deseado' } as any;
    }
    return undefined;
  }),
  ensureSeeded: jest.fn(async () => undefined),
};

describe('Admin moderation console (e2e)', () => {
  let app: INestApplication<App>;
  let tokenService: TokenService;
  let state: MockState;

  beforeEach(async () => {
    jest.clearAllMocks();

    state = {
      users: new Map<number, MockUser>([
        [1, { id: 1, email: 'admin@ofraud.test', firstName: 'Admin', lastName: 'Root', role: 'admin' }],
        [2, { id: 2, email: 'user@ofraud.test', firstName: 'Laura', lastName: 'Ríos', role: 'user' }],
        [3, { id: 3, email: 'author@ofraud.test', firstName: 'Carlos', lastName: 'Mena', role: 'user' }],
      ]),
      reports: new Map<number, MockReport>([
        [10, {
          id: 10,
          status: 'pending',
          authorId: 2,
          categoryId: 5,
          currentRevisionId: 1001,
          reviewedBy: null,
          reviewedAt: null,
          publishedAt: null,
          reviewNotes: null,
          rejectionReasonText: null,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-01T10:00:00Z'),
          deletedAt: null,
        }],
        [11, {
          id: 11,
          status: 'approved',
          authorId: 3,
          categoryId: 6,
          currentRevisionId: 1002,
          reviewedBy: 1,
          reviewedAt: new Date('2024-01-02T12:00:00Z'),
          publishedAt: new Date('2024-01-02T12:00:00Z'),
          reviewNotes: 'Aprobado originalmente',
          rejectionReasonText: null,
          createdAt: new Date('2024-01-01T08:00:00Z'),
          updatedAt: new Date('2024-01-02T12:00:00Z'),
          deletedAt: null,
        }],
        [12, {
          id: 12,
          status: 'pending',
          authorId: 3,
          categoryId: 6,
          currentRevisionId: 1003,
          reviewedBy: null,
          reviewedAt: null,
          publishedAt: null,
          reviewNotes: null,
          rejectionReasonText: null,
          createdAt: new Date('2024-01-03T09:00:00Z'),
          updatedAt: new Date('2024-01-03T09:00:00Z'),
          deletedAt: null,
        }],
        [13, {
          id: 13,
          status: 'removed',
          authorId: 3,
          categoryId: 6,
          currentRevisionId: 1004,
          reviewedBy: 1,
          reviewedAt: new Date('2024-01-04T09:30:00Z'),
          publishedAt: null,
          reviewNotes: 'Contenido retirado por incumplir políticas',
          rejectionReasonText: 'Incumplimiento de normas',
          createdAt: new Date('2024-01-02T11:00:00Z'),
          updatedAt: new Date('2024-01-04T09:30:00Z'),
          deletedAt: new Date('2024-01-04T09:30:00Z'),
        }],
      ]),
      revisions: new Map<number, MockRevision>([
        [1001, { id: 1001, reportId: 10, title: 'Campaña sospechosa en redes', createdAt: new Date('2024-01-01T10:00:00Z') }],
        [1002, { id: 1002, reportId: 11, title: 'Portal falso de banca', createdAt: new Date('2024-01-01T08:00:00Z') }],
        [1003, { id: 1003, reportId: 12, title: 'Venta engañosa por email', createdAt: new Date('2024-01-03T09:00:00Z') }],
        [1004, { id: 1004, reportId: 13, title: 'Marketplace fraudulento retirado', createdAt: new Date('2024-01-02T11:00:00Z') }],
      ]),
      categories: new Map<number, MockCategory>([
        [5, { id: 5, name: 'Estafas digitales' }],
        [6, { id: 6, name: 'Phishing' }],
      ]),
      history: [],
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DbService)
      .useValue({ getPool: () => ({}) })
      .overrideProvider(ReportRepository)
      .useValue(buildMockReportRepository(state))
      .overrideProvider(RejectionReasonRepository)
      .useValue(rejectionReasonRepositoryMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    tokenService = moduleFixture.get(TokenService);
  });

  afterEach(async () => {
    await app.close();
  });

  const getAdminToken = async () => {
    return tokenService.generateAccess({
      id: '1',
      email: 'admin@ofraud.test',
      name: 'Admin Root',
      role: 'admin',
    });
  };

  const getUserToken = async (userId: number) => {
    const user = state.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found in state`);
    }

    return tokenService.generateAccess({
      id: String(user.id),
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role,
    });
  };

  it('GET /admin/reports devuelve los reportes paginados filtrados por estado', async () => {
    const adminToken = await getAdminToken();

    const response = await request(app.getHttpServer())
      .get('/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ status: 'pending', limit: 10, page: 1 })
      .expect(200);

    expect(response.body.meta).toEqual({ page: 1, limit: 10, total: 2 });
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0]).toMatchObject({
      reportId: 12,
      status: 'pending',
      categoryName: 'Phishing',
    });
  });

  it('POST /reports/moderate permite aprobar un reporte pendiente', async () => {
    const adminToken = await getAdminToken();

    await request(app.getHttpServer())
      .post('/reports/moderate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'approve',
        reportId: 10,
        revisionId: 1001,
        note: 'Contenido verificado',
      })
      .expect(201)
      .expect({ success: true });

    const report = state.reports.get(10)!;
    expect(report.status).toBe('approved');
    expect(report.reviewedBy).toBe(1);
    expect(report.reviewNotes).toBe('Contenido verificado');
    expect(state.history.some((entry) => entry.reportId === 10 && entry.toStatus === 'approved')).toBe(true);
  });

  it('POST /reports/moderate permite rechazar un reporte con un motivo', async () => {
    const adminToken = await getAdminToken();

    await request(app.getHttpServer())
      .post('/reports/moderate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'reject',
        reportId: 12,
        revisionId: 1003,
        rejectionReasonId: 1,
        note: 'Información insuficiente',
      })
      .expect(201)
      .expect({ success: true });

    const report = state.reports.get(12)!;
    expect(report.status).toBe('rejected');
    expect(report.reviewedBy).toBe(1);
    expect(report.rejectionReasonText).toBe('Contenido promocional no deseado');
    expect(state.history.some((entry) => entry.reportId === 12 && entry.toStatus === 'rejected')).toBe(true);
  });

  it('DELETE /admin/reports/:id marca el reporte como eliminado', async () => {
    const adminToken = await getAdminToken();

    await request(app.getHttpServer())
      .delete('/admin/reports/11')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect({ success: true });

    const report = state.reports.get(11)!;
    expect(report.status).toBe('removed');
    expect(report.deletedAt).not.toBeNull();
    expect(state.history.some((entry) => entry.reportId === 11 && entry.toStatus === 'removed')).toBe(true);

    const adminListing = await request(app.getHttpServer())
      .get('/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ status: 'removed' })
      .expect(200);

    expect(adminListing.body.meta.total).toBe(2);
    expect(adminListing.body.items).toHaveLength(2);
    expect(adminListing.body.items.some((item: any) => item.reportId === 11)).toBe(true);
  });

  it('GET /reports/mine incluye reportes removed sin filtro de estado', async () => {
    const userToken = await getUserToken(3);

    const response = await request(app.getHttpServer())
      .get('/reports/mine')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ page: 1, limit: 10 })
      .expect(200);
    expect(response.body.meta).toEqual({ page: 1, limit: 10, total: 3 });
    expect(response.body.items).toHaveLength(3);
    expect(
      response.body.items.some(
        (item: any) => item.reportId === 13 && item.status === 'removed',
      ),
    ).toBe(true);
  });

  it('GET /reports/mine filtra correctamente los reportes removed', async () => {
    const userToken = await getUserToken(3);

    const response = await request(app.getHttpServer())
      .get('/reports/mine')
      .set('Authorization', `Bearer ${userToken}`)
      .query({ status: 'removed', page: 1, limit: 10 })
      .expect(200);
    expect(response.body.meta).toEqual({ page: 1, limit: 10, total: 1 });
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({ reportId: 13, status: 'removed' });
  });
});
