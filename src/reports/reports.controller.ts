/* eslint-disable prettier/prettier */

import { Body, Controller, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { AddMediaDto } from './dto/add-media.dto';
import { ModerateReportDto } from './dto/moderate-report.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

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
}
