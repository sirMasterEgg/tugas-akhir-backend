import { Injectable } from '@nestjs/common';
import { CreatePostWDto } from './dto/create-post-w.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Question } from '../user/entities/question.entity';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { FilesReference } from '../user/entities/files-reference.entity';
import {
  TrimmedQuestion,
  TrimmedQuestionMapper,
} from '../mapper/question.entity';
import { Group } from '../group/entities/group.entity';
import { FileService } from '../file/file.service';
import { WsException } from '@nestjs/websockets';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationObserverDto } from '../notification-observer/dto/NotificationObserverDto';
import { Events } from './enums/ws-message.enum';

@Injectable()
export class PostWsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(FilesReference)
    private fileReferenceRepository: Repository<FilesReference>,
    private readonly fileService: FileService,
    private readonly eventEmmiter: EventEmitter2,
  ) {}

  async askQuestion(
    user: User,
    askDto: CreatePostWDto,
  ): Promise<TrimmedQuestion> {
    let userToAsk = null,
      groupToAsk = null;

    console.log(askDto);
    if (askDto.userId) {
      userToAsk = await this.userRepository.findOne({
        where: {
          id: askDto.userId,
        },
      });

      console.log(userToAsk);
      if (userToAsk && !userToAsk.acceptQuestion) {
        throw new WsException('User not accepting questions');
      }
    }
    if (askDto.groupId) {
      groupToAsk = await this.groupRepository.findOne({
        where: {
          id: askDto.groupId,
        },
      });
    }

    if (askDto.userId && askDto.groupId && !userToAsk && !groupToAsk) {
      throw new WsException('User or group not found');
    }

    const ask = new Question();

    const owner = new User();
    owner.id = user.id;
    ask.owner = owner;

    ask.question = askDto.content;
    ask.anonymous = !!askDto.anonymous === true;

    if (userToAsk) {
      ask.targetUser = userToAsk;
    }
    if (groupToAsk) {
      ask.targetGroup = groupToAsk;
    }

    const savedQuestion = await this.questionRepository.save(ask);

    if (askDto.files && askDto.files.length > 0) {
      const filesReference = askDto.files.map(async (file) => {
        const filesReference = new FilesReference();
        filesReference.question = savedQuestion;
        try {
          const buffer = Buffer.from(file, 'base64');
          filesReference.fileName = await this.fileService.saveFile(buffer);
        } catch (e) {
          throw new WsException('File invalid');
        }

        return filesReference;
      });

      ask.files = await this.fileReferenceRepository.save(
        await Promise.all(filesReference),
      );
    }

    const results = await this.questionRepository.findOne({
      where: {
        id: savedQuestion.id,
      },
      relations: [
        'owner',
        'targetUser',
        'targetGroup',
        'files',
        'replies',
        'upvoters',
        'targetGroup.userGroups',
      ],
    });

    if (results.targetUser) {
      this.eventEmmiter.emit(
        Events.NOTIFICATION_CREATED,
        NotificationObserverDto.forPersonalQuestion({
          room: [results.targetUser.id],
          askerUsername: results.anonymous ? 'Anonymous' : results.owner.name,
          question: results.question,
        }),
      );
    }
    if (results.targetGroup) {
      this.eventEmmiter.emit(
        Events.NOTIFICATION_CREATED,
        NotificationObserverDto.forGroupQuestion({
          room: results.targetGroup?.userGroups.map(
            (userGroup) => userGroup.userId,
          ),
          groupName: results.targetGroup.name,
          askerUsername: results.anonymous ? 'Anonymous' : results.owner.name,
          question: results.question,
        }),
      );
    }

    return TrimmedQuestionMapper.fromQuestion(results, user);
  }
}
