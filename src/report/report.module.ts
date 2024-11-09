import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { ReportUser } from './entities/report-user.entity';
import { User } from '../user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { QuestionReply } from '../question-reply/entities/question-reply.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report, ReportUser, User, QuestionReply]),
  ],
  controllers: [ReportController],
  providers: [ReportService, JwtService],
})
export class ReportModule {}
