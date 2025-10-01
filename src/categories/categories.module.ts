import { Module } from '@nestjs/common';
import { DbModule } from 'src/db/db.module';
import { AdminRepository } from 'src/admin/admin.repository';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [DbModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, AdminRepository],
})
export class CategoriesModule {}
