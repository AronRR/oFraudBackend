/* eslint-disable prettier/prettier */

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';

import { UserModule } from './users/user.module';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { FilesModule } from './files/files.module';
import { ReportsModule } from './reports/reports.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [JwtModule.register({
      global: true,
      secret:"supersecret"
  }), 
  DbModule, UserModule, AuthModule, FilesModule, ReportsModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
