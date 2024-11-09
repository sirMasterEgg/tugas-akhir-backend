import { Module } from '@nestjs/common';
import { PostWsService } from './post-ws.service';
import { PostWsGateway } from './post-ws.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from '../user/entities/question.entity';
import { QuestionReply } from '../question-reply/entities/question-reply.entity';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/entities/user.entity';
import { Group } from '../group/entities/group.entity';
import { FilesReference } from '../user/entities/files-reference.entity';
import { FileService } from '../file/file.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Question,
      QuestionReply,
      User,
      Group,
      FilesReference,
    ]),
  ],
  providers: [PostWsGateway, PostWsService, JwtService, FileService],
  exports: [PostWsGateway, PostWsService],
})
export class PostWsModule {}
