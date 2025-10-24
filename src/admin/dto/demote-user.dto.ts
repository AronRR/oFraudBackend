import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class DemoteUserDto {
  @ApiProperty({
    description: 'Razón de la degradación del administrador a usuario regular',
    example: 'Fin del periodo de moderación',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
