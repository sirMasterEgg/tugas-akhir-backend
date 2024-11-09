import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { JwtService } from '@nestjs/jwt';
import { Question } from './entities/question.entity';
import { FilesReference } from './entities/files-reference.entity';
import { Group } from '../group/entities/group.entity';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { FileService } from '../file/file.service';
import { memoryStorage } from 'multer';
import { FollowedGroup } from '../group/entities/followed-group.entity';
import { BlockedUser } from './entities/blocked-user.entity';
import { QuestionReply } from '../question-reply/entities/question-reply.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Notification,
      Question,
      FilesReference,
      Group,
      FollowedGroup,
      BlockedUser,
      QuestionReply,
    ]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        dest: configService.get<string>('UPLOAD_PATH'),
        storage: memoryStorage(),
      }),
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [UserController],
  providers: [UserService, JwtService, FileService],
})
export class UserModule {}
