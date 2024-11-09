import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { PunishmentStatus } from './entities/user-status.entity';
import { Report } from '../report/entities/report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, PunishmentStatus, Report])],
  controllers: [AdminController],
  providers: [AdminService, JwtService],
})
export class AdminModule {}
