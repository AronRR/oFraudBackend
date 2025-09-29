import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class BlockUserDto {
  @ApiPropertyOptional({ description: 'Motivo del bloqueo aplicado por el administrador', example: 'Incumplimiento reiterado de las normas' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  reason?: string;
}
