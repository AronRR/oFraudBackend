import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { BlockUserDto } from './dto/block-user.dto';
import type { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request';
import { MetricsOverviewDto } from './dto/metrics-overview.dto';
import { MetricsTopCategoryDto } from './dto/metrics-top-category.dto';
import { MetricsTopHostDto } from './dto/metrics-top-host.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorías con sus contadores' })
  @ApiOkResponse({ type: [CategoryResponseDto] })
  async listCategories(): Promise<CategoryResponseDto[]> {
    return this.adminService.listCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Crear una nueva categoría' })
  @ApiCreatedResponse({ type: CategoryResponseDto })
  async createCategory(@Body() body: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.adminService.createCategory(body);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Actualizar una categoría existente' })
  @ApiOkResponse({ type: CategoryResponseDto })
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.adminService.updateCategory(id, body);
  }

  @Post('users/:id/block')
  @ApiOperation({ summary: 'Bloquear a un usuario' })
  @ApiOkResponse({ description: 'Usuario bloqueado correctamente' })
  async blockUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: BlockUserDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    const adminId = Number(req.user.userId);
    await this.adminService.blockUser(id, adminId, body);
  }

  @Delete('users/:id/block')
  @ApiOperation({ summary: 'Desbloquear a un usuario' })
  @ApiOkResponse({ description: 'Usuario desbloqueado correctamente' })
  async unblockUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    const adminId = Number(req.user.userId);
    await this.adminService.unblockUser(id, adminId);
  }

  @Get('metrics/overview')
  @ApiOperation({ summary: 'Obtener métricas generales del sistema' })
  @ApiOkResponse({ type: MetricsOverviewDto })
  async getMetricsOverview(): Promise<MetricsOverviewDto> {
    return this.adminService.getMetricsOverview();
  }

  @Get('metrics/top-categories')
  @ApiOperation({ summary: 'Obtener categorías con más actividad' })
  @ApiQuery({ name: 'limit', required: false, description: 'Número de categorías a devolver', type: Number, example: 5 })
  @ApiOkResponse({ type: [MetricsTopCategoryDto] })
  async getTopCategories(@Query('limit') limit?: string): Promise<MetricsTopCategoryDto[]> {
    const parsed = Number(limit);
    const sanitizedLimit = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 5;
    return this.adminService.getTopCategories(sanitizedLimit);
  }

  @Get('metrics/top-hosts')
  @ApiOperation({ summary: 'Obtener los hosts con más reportes registrados' })
  @ApiQuery({ name: 'limit', required: false, description: 'Número de hosts a devolver', type: Number, example: 5 })
  @ApiOkResponse({ type: [MetricsTopHostDto] })
  async getTopHosts(@Query('limit') limit?: string): Promise<MetricsTopHostDto[]> {
    const parsed = Number(limit);
    const sanitizedLimit = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 5;
    return this.adminService.getTopHosts(sanitizedLimit);
  }
}
