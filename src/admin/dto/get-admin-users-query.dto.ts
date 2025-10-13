import { IsOptional, IsString, IsIn, IsNumberString } from 'class-validator';

export class GetAdminUsersQueryDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  is_blocked?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
