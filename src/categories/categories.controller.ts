import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryResponseDto } from 'src/admin/dto/category-response.dto';
import { CategoriesService } from './categories.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar categorías públicas disponibles' })
  @ApiOkResponse({ type: [CategoryResponseDto] })
  async listCategories(): Promise<CategoryResponseDto[]> {
    return this.categoriesService.listCategories();
  }
}
