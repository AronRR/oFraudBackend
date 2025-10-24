import { ApiProperty } from '@nestjs/swagger';

export class AdminListItemDto {
  @ApiProperty({ description: 'ID del administrador', example: 1 })
  id: number;

  @ApiProperty({ description: 'Email', example: 'admin@ofraud.com' })
  email: string;

  @ApiProperty({ description: 'Username', example: 'admin123' })
  username: string;

  @ApiProperty({ description: 'Nombre completo', example: 'Admin Usuario' })
  fullName: string;

  @ApiProperty({ description: 'Rol del usuario', enum: ['admin', 'superadmin'], example: 'admin' })
  role: 'admin' | 'superadmin';

  @ApiProperty({ description: 'Fecha de creación', example: '2025-01-01T00:00:00Z' })
  createdAt: string;

  @ApiProperty({ description: 'Último login', example: '2025-01-24T12:00:00Z', nullable: true })
  lastLoginAt: string | null;
}

export class GetAdminsResponseDto {
  @ApiProperty({ description: 'Lista de administradores', type: [AdminListItemDto] })
  items: AdminListItemDto[];

  @ApiProperty({ description: 'Metadatos' })
  meta: {
    total: number;
    admins: number;
    superadmins: number;
  };
}
