import { Module } from '@nestjs/common';
import { QuestionReplyService } from './question-reply.service';
import { QuestionReplyController } from './question-reply.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionReply } from './entities/question-reply.entity';
import { Question } from '../user/entities/question.entity';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuestionReply, Question, User])],
  controllers: [QuestionReplyController],
  providers: [QuestionReplyService, JwtService],
})
export class QuestionReplyModule {}
