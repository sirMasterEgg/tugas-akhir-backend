import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateQuestionReplyDto } from './dto/create-question-reply.dto';
import { UpdateQuestionReplyDto } from './dto/update-question-reply.dto';
import { Repository, TypeORMError } from 'typeorm';
import { QuestionReply } from './entities/question-reply.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Question } from '../user/entities/question.entity';
import {
  TrimmedQuestionReply,
  TrimmedQuestionReplyMapper,
} from '../mapper/question-reply.entity';
import { User } from '../user/entities/user.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Events } from '../post-ws/enums/ws-message.enum';
import { NotificationObserverDto } from '../notification-observer/dto/NotificationObserverDto';

@Injectable()
export class QuestionReplyService {
  constructor(
    @InjectRepository(QuestionReply)
    private readonly questionReplyRepository: Repository<QuestionReply>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmmiter: EventEmitter2,
  ) {}

  async create(
    currentUser: User,
    postId: string,
    createQuestionReplyDto: CreateQuestionReplyDto,
  ): Promise<TrimmedQuestionReply> {
    const [user, question] = await Promise.all([
      this.userRepository.findOne({
        where: {
          id: currentUser.id,
        },
      }),
      this.questionRepository.findOne({
        where: {
          id: postId,
        },
      }),
    ]);

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    try {
      const questionReply = new QuestionReply();
      questionReply.question = question;
      questionReply.content = createQuestionReplyDto.content;
      questionReply.anonymous = createQuestionReplyDto.anonymous;
      questionReply.owner = user;

      const savedReply = await this.questionReplyRepository.save(questionReply);

      const savedQuestionReply = await this.questionReplyRepository.findOne({
        where: { id: savedReply.id },
        relations: ['owner', 'upvoters'],
      });

      this.eventEmmiter.emit(
        Events.NOTIFICATION_CREATED,
        NotificationObserverDto.forNewAnswer({
          room: [question?.owner?.id],
          responderUsername: user.username,
          answer: questionReply.content,
        }),
      );

      return TrimmedQuestionReplyMapper.fromQuestionReply(
        savedQuestionReply,
        user,
      );
    } catch (e) {
      if (e instanceof TypeORMError) {
        Logger.error(e.message);
      }
      Logger.error(JSON.stringify(e));
    }
  }

  update(
    replyId: string,
    postId: string,
    updateQuestionReplyDto: UpdateQuestionReplyDto,
  ) {
    return `This action updates a #${replyId} questionReply`;
  }

  remove(replyId: string, postId: string) {
    return `This action removes a #${replyId} questionReply`;
  }
}
