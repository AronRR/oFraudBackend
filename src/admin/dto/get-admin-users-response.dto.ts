import { ApiProperty } from '@nestjs/swagger';

export class AdminUserDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  first_name: string;

  @ApiProperty()
  last_name: string;

  @ApiProperty({ nullable: true })
  phone_number: string | null;

  @ApiProperty({ enum: ['user', 'admin'] })
  role: 'user' | 'admin';

  @ApiProperty()
  is_blocked: boolean;

  @ApiProperty({ nullable: true })
  blocked_at: Date | null;

  @ApiProperty({ nullable: true })
  blocked_reason: string | null;

  @ApiProperty({ nullable: true })
  blocked_by: number | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}

export class PaginationMetaDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;
}

export class UsersCountsDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  blocked: number;

  @ApiProperty()
  active: number;
}

export class GetAdminUsersResponseDto {
  @ApiProperty({ type: [AdminUserDto] })
  items: AdminUserDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;

  @ApiProperty({ type: UsersCountsDto })
  counts: UsersCountsDto;
}
