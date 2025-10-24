import { ApiProperty } from '@nestjs/swagger';

export class AdminActionAuditItemDto {
  @ApiProperty({ description: 'ID del log de auditoría', example: 1 })
  id: number;

  @ApiProperty({ description: 'ID del administrador que realizó la acción', example: 2 })
  adminId: number;

  @ApiProperty({ description: 'Email del administrador', example: 'admin@ofraud.com', nullable: true })
  adminEmail: string | null;

  @ApiProperty({ description: 'Nombre del administrador', example: 'Admin Usuario', nullable: true })
  adminName: string | null;

  @ApiProperty({
    description: 'Información detallada del administrador',
    type: 'object',
    properties: {
      id: { type: 'number', example: 2 },
      email: { type: 'string', example: 'admin@ofraud.com', nullable: true },
      fullName: { type: 'string', example: 'Admin Usuario' },
    },
  })
  admin: {
    id: number;
    email: string | null;
    fullName: string;
  };

  @ApiProperty({
    description: 'Tipo de acción realizada',
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
  actionType: string;

  @ApiProperty({
    description: 'Tipo de objetivo de la acción',
    enum: ['report', 'user', 'category', 'flag', 'multiple'],
    example: 'report',
    nullable: true,
  })
  targetType: string | null;

  @ApiProperty({ description: 'ID del objetivo', example: 123, nullable: true })
  targetId: number | null;

  @ApiProperty({ description: 'Detalles adicionales en JSON', example: { reportId: 123, reason: 'Cumple requisitos' }, nullable: true })
  details: Record<string, any> | null;

  @ApiProperty({ description: 'Dirección IP desde donde se realizó la acción', example: '192.168.1.1', nullable: true })
  ipAddress: string | null;

  @ApiProperty({ description: 'Fecha de creación del log', example: '2025-01-24T12:00:00Z' })
  createdAt: string;
}

export class GetAuditLogsResponseDto {
  @ApiProperty({ description: 'Lista de logs de auditoría', type: [AdminActionAuditItemDto] })
  items: AdminActionAuditItemDto[];

  @ApiProperty({ description: 'Metadatos de paginación' })
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
