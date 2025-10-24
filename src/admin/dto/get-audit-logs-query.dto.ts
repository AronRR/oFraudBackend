import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, IsString, IsEnum, IsDateString, Min } from 'class-validator';

export class GetAuditLogsQueryDto {
  @ApiPropertyOptional({ description: 'Número de página', example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Cantidad de registros por página', example: 20, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filtrar por ID de administrador', example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  adminId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de acción',
    enum: [
      'login',
      'approve_report',
      'reject_report',
      'delete_report',
      'block_user',
      'unblock_user',
      'promote_user',
      'demote_user',
      'create_category',
      'update_category',
      'resolve_flag',
      'bulk_action',
    ],
    example: 'approve_report',
  })
  @IsOptional()
  @IsEnum([
    'login',
    'approve_report',
    'reject_report',
    'delete_report',
    'block_user',
    'unblock_user',
    'promote_user',
    'demote_user',
    'create_category',
    'update_category',
    'resolve_flag',
    'bulk_action',
  ])
  actionType?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de objetivo',
    enum: ['report', 'user', 'category', 'flag', 'multiple'],
    example: 'report',
  })
  @IsOptional()
  @IsEnum(['report', 'user', 'category', 'flag', 'multiple'])
  targetType?: string;

  @ApiPropertyOptional({ description: 'Fecha desde (ISO 8601)', example: '2025-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha hasta (ISO 8601)', example: '2025-01-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
