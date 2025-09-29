/* eslint-disable prettier/prettier */

import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { AddMediaDto } from './dto/add-media.dto';
import { ModerateReportDto } from './dto/moderate-report.dto';
import { GetReportsQueryDto } from './dto/get-reports-query.dto';
import { GetReportsResponseDto } from './dto/get-reports-response.dto';
import { GetMyReportsQueryDto } from './dto/get-my-reports-query.dto';
import { GetMyReportsResponseDto } from './dto/get-my-reports-response.dto';

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
  async createReport(@Req() req: AuthenticatedRequest, @Body() dto: CreateReportDto) {
    const userId = Number(req.user.userId);
    return this.reportsService.createReport({ userId }, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateReport(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) reportId: number,
    @Body() dto: UpdateReportDto,
  ) {
    const userId = Number(req.user.userId);
    return this.reportsService.updateReport(reportId, { userId }, dto);
  }

  @Post('revisions/:id/media')
  @UseGuards(JwtAuthGuard)
  async addMedia(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) revisionId: number,
    @Body() dto: Omit<AddMediaDto, 'revisionId'>,
  ) {
    const userId = Number(req.user.userId);
    return this.reportsService.addMediaToRevision({ userId }, { ...dto, revisionId });
  }

  @Post('moderate')
  @UseGuards(JwtAuthGuard)
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
  async deleteReport(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) reportId: number,
  ): Promise<{ success: true }> {
    const userId = Number(req.user.userId);
    await this.reportsService.deleteReport(reportId, { userId });
    return { success: true };
  }
}
