import { Module } from '@nestjs/common';
import { VipService } from './vip.service';
import { VipController } from './vip.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vip } from './entities/vip.entity';
import { HttpModule } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vip, User]), HttpModule],
  controllers: [VipController],
  providers: [VipService, JwtService],
})
export class VipModule {}
