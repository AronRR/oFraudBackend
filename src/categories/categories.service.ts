import { Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { AdminRepository } from 'src/admin/admin.repository';
import { CategoryResponseDto } from 'src/admin/dto/category-response.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async listCategories(): Promise<CategoryResponseDto[]> {
    const rows = await this.adminRepository.listCategories();
    return rows.map((row) => this.mapCategory(row));
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
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
      updated_at:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : String(row.updated_at),
    };
  }
}
