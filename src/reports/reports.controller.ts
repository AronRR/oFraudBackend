/* eslint-disable prettier/prettier */

import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';
import type { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ModerateReportDto } from './dto/moderate-report.dto';
import { GetReportsQueryDto } from './dto/get-reports-query.dto';
import { GetReportsResponseDto } from './dto/get-reports-response.dto';
import { GetMyReportsQueryDto } from './dto/get-my-reports-query.dto';
import { GetMyReportsResponseDto } from './dto/get-my-reports-response.dto';
import { CreateReportRatingDto } from './dto/create-report-rating.dto';
import { UpdateReportRatingDto } from './dto/update-report-rating.dto';
import { DeleteReportRatingResponseDto, ReportRatingResponseDto } from './dto/report-rating-response.dto';
import { CreateReportCommentDto } from './dto/create-report-comment.dto';
import { UpdateReportCommentDto } from './dto/update-report-comment.dto';
import { GetReportCommentsQueryDto } from './dto/get-report-comments-query.dto';
import { GetReportCommentsResponseDto, ReportCommentDto } from './dto/get-report-comments-response.dto';
import { CreateReportFlagDto } from './dto/create-report-flag.dto';
import { ReportFlagResponseDto } from './dto/report-flag-response.dto';
import { ReportDetailDto } from './dto/report-detail.dto';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener feed público de reportes aprobados' })
  @ApiOkResponse({ type: GetReportsResponseDto })
  async listApprovedReports(@Query() query: GetReportsQueryDto): Promise<GetReportsResponseDto> {
    return this.reportsService.getApprovedReports(query);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar reportes creados por el usuario autenticado' })
  @ApiOkResponse({ type: GetMyReportsResponseDto })
  async listMyReports(
    @Req() req: AuthenticatedRequest,
    @Query() query: GetMyReportsQueryDto,
  ): Promise<GetMyReportsResponseDto> {
    const userId = Number(req.user.userId);
    return this.reportsService.getMyReports({ userId }, query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Crear un nuevo reporte de fraude' })
  @ApiCreatedResponse({
    description: 'Reporte creado exitosamente y enviado a moderación',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        status: { type: 'string', example: 'pending' }
      }
    }
  })
  async createReport(@Req() req: AuthenticatedRequest, @Body() dto: CreateReportDto) {
    const userId = Number(req.user.userId);
    return this.reportsService.createReport({ userId }, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar un reporte existente' })
  @ApiOkResponse({
    description: 'Reporte actualizado correctamente',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        message: { type: 'string', example: 'Reporte actualizado correctamente' }
      }
    }
  })
  async updateReport(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) reportId: number,
    @Body() dto: UpdateReportDto,
  ) {
    const userId = Number(req.user.userId);
    return this.reportsService.updateReport(reportId, { userId }, dto);
  }

  @Post('moderate')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiOperation({ summary: 'Moderar reportes enviados por la comunidad', description: 'Requiere rol de administrador.' })
  async moderateReport(@Req() req: AuthenticatedRequest, @Body() dto: ModerateReportDto) {
    const userId = Number(req.user.userId);
    const role = req.user.role;
    await this.reportsService.moderateReport(
      { userId, role },
      {
        action: dto.action,
        reportId: dto.reportId,
        revisionId: dto.revisionId,
        rejectionReasonId: dto.rejectionReasonId,
        rejectionReasonCode: dto.rejectionReasonCode,
        rejectionReasonText: dto.rejectionReasonText,
        note: dto.note,
      },
    );
    return { success: true };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Eliminar un reporte propio' })
  @ApiOkResponse({
    description: 'Reporte eliminado correctamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true }
      }
    }
  })
  async deleteReport(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) reportId: number,
  ): Promise<{ success: true }> {
    const userId = Number(req.user.userId);
    await this.reportsService.deleteReport(reportId, { userId });
    return { success: true };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un reporte aprobado' })
  @ApiOkResponse({ type: ReportDetailDto })
  async getApprovedReportDetail(@Param('id', ParseIntPipe) reportId: number): Promise<ReportDetailDto> {
    return this.reportsService.getApprovedReportDetail(reportId);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Listar comentarios visibles de un reporte aprobado' })
  @ApiOkResponse({ type: GetReportCommentsResponseDto })
  async listReportComments(
    @Param('id', ParseIntPipe) reportId: number,
    @Query() query: GetReportCommentsQueryDto,
  ): Promise<GetReportCommentsResponseDto> {
    return this.reportsService.getReportComments(reportId, query);
  }

  @Post(':id/ratings')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Registrar una calificación de 1 a 5 estrellas' })
  @ApiCreatedResponse({ type: ReportRatingResponseDto })
  async createReportRating(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) reportId: number,
    @Body() dto: CreateReportRatingDto,
  ): Promise<ReportRatingResponseDto> {
    const userId = Number(req.user.userId);
    const role = req.user.role;
    return this.reportsService.createReportRating(reportId, { userId, role }, dto);
  }

  @Patch(':id/ratings/:ratingId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar una calificación existente' })
  @ApiOkResponse({ type: ReportRatingResponseDto })
  async updateReportRating(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) reportId: number,
    @Param('ratingId', ParseIntPipe) ratingId: number,
    @Body() dto: UpdateReportRatingDto,
  ): Promise<ReportRatingResponseDto> {
    const userId = Number(req.user.userId);
    const role = req.user.role;
    return this.reportsService.updateReportRating(reportId, ratingId, { userId, role }, dto);
  }

  @Delete(':id/ratings/:ratingId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Eliminar una calificación propia o moderada' })
  @ApiOkResponse({ type: DeleteReportRatingResponseDto })
  async deleteReportRating(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) reportId: number,
    @Param('ratingId', ParseIntPipe) ratingId: number,
  ): Promise<DeleteReportRatingResponseDto> {
    const userId = Number(req.user.userId);
    const role = req.user.role;
    return this.reportsService.deleteReportRating(reportId, ratingId, { userId, role });
  }

  @Post(':id/flags')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reportar un reporte aprobado para moderación' })
  @ApiCreatedResponse({ type: ReportFlagResponseDto })
  async createReportFlag(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) reportId: number,
    @Body() dto: CreateReportFlagDto,
  ): Promise<ReportFlagResponseDto> {
    const userId = Number(req.user.userId);
    return this.reportsService.createReportFlag(reportId, { userId }, dto);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Publicar un comentario sobre un reporte aprobado' })
  @ApiCreatedResponse({ type: ReportCommentDto })
  async createReportComment(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) reportId: number,
    @Body() dto: CreateReportCommentDto,
  ): Promise<ReportCommentDto> {
    const userId = Number(req.user.userId);
    const role = req.user.role;
    return this.reportsService.createReportComment(reportId, { userId, role }, dto);
  }

  @Patch(':id/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Actualizar un comentario existente' })
  @ApiOkResponse({ type: ReportCommentDto })
  async updateReportComment(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) reportId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: UpdateReportCommentDto,
  ): Promise<ReportCommentDto> {
    const userId = Number(req.user.userId);
    const role = req.user.role;
    return this.reportsService.updateReportComment(reportId, commentId, { userId, role }, dto);
  }

  @Delete(':id/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Eliminar un comentario propio o moderado' })
  async deleteReportComment(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) reportId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
  ): Promise<{ success: true }> {
    const userId = Number(req.user.userId);
    const role = req.user.role;
    await this.reportsService.deleteReportComment(reportId, commentId, { userId, role });
    return { success: true };
  }
}
