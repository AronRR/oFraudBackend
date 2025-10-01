import { Test, TestingModule } from '@nestjs/testing';
import { AdminRepository } from 'src/admin/admin.repository';
import { CategoriesService } from './categories.service';

const buildRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  name: 'Fraude bancario',
  slug: 'fraude-bancario',
  description: 'Reportes relacionados a bancos',
  is_active: 1,
  reports_count: 42,
  search_count: 7,
  created_at: new Date('2024-01-01T00:00:00.000Z'),
  updated_at: new Date('2024-02-01T00:00:00.000Z'),
  ...overrides,
});

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: AdminRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: AdminRepository,
          useValue: {
            listCategories: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CategoriesService);
    repository = module.get(AdminRepository);
  });

  it('debería devolver categorías mapeadas correctamente', async () => {
    const mockRow = buildRow();
    jest.spyOn(repository, 'listCategories').mockResolvedValue([mockRow as any]);

    const result = await service.listCategories();

    expect(repository.listCategories).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        id: 1,
        name: 'Fraude bancario',
        slug: 'fraude-bancario',
        description: 'Reportes relacionados a bancos',
        is_active: true,
        reports_count: 42,
        search_count: 7,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-02-01T00:00:00.000Z',
      },
    ]);
  });

  it('debería normalizar valores nulos', async () => {
    const mockRow = buildRow({
      description: null,
      is_active: 0,
      reports_count: null,
      search_count: undefined,
      created_at: '2024-01-01 00:00:00',
      updated_at: '2024-02-01 00:00:00',
    });
    jest.spyOn(repository, 'listCategories').mockResolvedValue([mockRow as any]);

    const result = await service.listCategories();

    expect(result).toEqual([
      {
        id: 1,
        name: 'Fraude bancario',
        slug: 'fraude-bancario',
        description: null,
        is_active: false,
        reports_count: 0,
        search_count: 0,
        created_at: '2024-01-01 00:00:00',
        updated_at: '2024-02-01 00:00:00',
      },
    ]);
  });
});
