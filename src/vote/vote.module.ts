import { Module } from '@nestjs/common';
import { VoteService } from './vote.service';
import { VoteController } from './vote.controller';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from '../user/entities/question.entity';
import { QuestionReply } from '../question-reply/entities/question-reply.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Question, QuestionReply, User])],
  controllers: [VoteController],
  providers: [VoteService, JwtService, ConfigService],
})
export class VoteModule {}
