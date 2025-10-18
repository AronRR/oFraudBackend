import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
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
import { GetAdminReportsQueryDto } from './dto/get-admin-reports-query.dto';
import { GetAdminReportsResponseDto } from './dto/get-admin-reports-response.dto';
import { AdminReportDetailDto } from './dto/admin-report-detail.dto';

import { GetReportFlagsQueryDto } from './dto/get-report-flags-query.dto';
import { GetReportFlagsResponseDto } from './dto/get-report-flags-response.dto';
import { ResolveReportFlagDto } from './dto/resolve-report-flag.dto';
import { ReportFlagResponseDto } from 'src/reports/dto/report-flag-response.dto';
import { GetAdminUsersQueryDto } from './dto/get-admin-users-query.dto';
import { GetAdminUsersResponseDto } from './dto/get-admin-users-response.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('reports')
  @ApiOperation({ summary: 'Listar reportes para la consola de moderación' })
  @ApiOkResponse({ type: GetAdminReportsResponseDto })
  async listReports(@Query() query: GetAdminReportsQueryDto): Promise<GetAdminReportsResponseDto> {
    return this.adminService.listReports(query);
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Obtener detalle de un reporte' })
  @ApiOkResponse({ type: AdminReportDetailDto })
  async getReportDetail(@Param('id', ParseIntPipe) id: number): Promise<AdminReportDetailDto> {
    return this.adminService.getReportDetail(id);
  }

  @Get('report-flags')
  @ApiOperation({ summary: 'Listar flags de reportes para revisión' })
  @ApiOkResponse({ type: GetReportFlagsResponseDto })
  async listReportFlags(@Query() query: GetReportFlagsQueryDto): Promise<GetReportFlagsResponseDto> {
    return this.adminService.listReportFlags(query);
  }

  @Patch('report-flags/:id')
  @ApiOperation({ summary: 'Resolver un flag de reporte' })
  @ApiOkResponse({ type: ReportFlagResponseDto })
  async resolveReportFlag(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveReportFlagDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ReportFlagResponseDto> {
    const adminId = Number(req.user.userId);
    return this.adminService.resolveReportFlag(id, adminId, dto);
  }

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

  @Get('users')
  @ApiOperation({ summary: 'Listar usuarios del sistema' })
  @ApiOkResponse({ type: GetAdminUsersResponseDto })
  async listUsers(@Query() query: GetAdminUsersQueryDto): Promise<GetAdminUsersResponseDto> {
    return this.adminService.listUsers(query);
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

  @Delete('reports/:id')
  @ApiOperation({ summary: 'Eliminar un reporte desde la consola de administración' })
  @ApiOkResponse({ description: 'Reporte eliminado correctamente' })
  async removeReport(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: true }> {
    const adminId = Number(req.user.userId);
    await this.adminService.removeReport(id, adminId);
    return { success: true };
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


