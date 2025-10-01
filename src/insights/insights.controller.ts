/* eslint-disable prettier/prettier */

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InsightsService } from './insights.service';
import { TopHostDto } from './dto/top-host.dto';
import { TopCategoryDto } from './dto/top-category.dto';
import { FraudStatsDto } from './dto/fraud-stats.dto';
import { EducationalContentDto } from './dto/educational-content.dto';

@ApiTags('Insights')
@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get('top-hosts')
  @ApiOperation({
    summary: 'Obtener hosts con más reportes',
    description: 'Lista los sitios web/dominios con mayor cantidad de reportes en un período específico',
  })
  @ApiQuery({ name: 'period', required: false, enum: ['weekly', 'monthly'], description: 'Período de tiempo' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Número máximo de resultados', example: 10 })
  @ApiOkResponse({ type: [TopHostDto] })
  async getTopHosts(
    @Query('period') period?: 'weekly' | 'monthly',
    @Query('limit') limit?: string,
  ): Promise<TopHostDto[]> {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const validLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 10;

    return this.insightsService.getTopHosts(period ?? 'weekly', validLimit);
  }

  @Get('top-categories')
  @ApiOperation({
    summary: 'Obtener categorías más populares',
    description: 'Lista las categorías con mayor actividad (reportes + búsquedas)',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Número máximo de resultados', example: 10 })
  @ApiOkResponse({ type: [TopCategoryDto] })
  async getTopCategories(@Query('limit') limit?: string): Promise<TopCategoryDto[]> {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const validLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 10;

    return this.insightsService.getTopCategories(validLimit);
  }

  @Get('fraud-stats')
  @ApiOperation({
    summary: 'Obtener estadísticas generales de fraude',
    description: 'Devuelve métricas generales del sistema: total de reportes, usuarios activos, etc.',
  })
  @ApiOkResponse({ type: FraudStatsDto })
  async getFraudStats(): Promise<FraudStatsDto> {
    return this.insightsService.getFraudStats();
  }

  @Get('educational')
  @ApiOperation({
    summary: 'Listar temas educativos disponibles',
    description: 'Devuelve todos los temas educativos sobre fraude y prevención',
  })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string', example: 'phishing' },
          title: { type: 'string', example: '¿Qué es el phishing?' },
        },
      },
    },
  })
  async listEducationalTopics(): Promise<{ topic: string; title: string }[]> {
    return this.insightsService.listEducationalTopics();
  }

  @Get('educational/:topic')
  @ApiOperation({
    summary: 'Obtener contenido educativo por tema',
    description: 'Devuelve información detallada sobre un tema específico de prevención de fraude',
  })
  @ApiParam({
    name: 'topic',
    description: 'Tema educativo',
    enum: ['phishing', 'what-to-do', 'preventive-tips', 'identity-theft', 'detection-time'],
  })
  @ApiOkResponse({ type: EducationalContentDto })
  async getEducationalContent(@Param('topic') topic: string): Promise<EducationalContentDto> {
    return this.insightsService.getEducationalContent(topic);
  }
}
