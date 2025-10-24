import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class PromoteUserDto {
  @ApiProperty({
    description: 'Razón de la promoción del usuario a administrador',
    example: 'Usuario confiable con experiencia moderando reportes',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
