import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from '../user/entities/user.entity';
import { UpvoteDto } from './dto/upvote.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Question } from '../user/entities/question.entity';
import { Repository } from 'typeorm';
import { QuestionReply } from '../question-reply/entities/question-reply.entity';
import { TrimmedQuestionMapper } from '../mapper/question.entity';
import { TrimmedQuestionReplyMapper } from '../mapper/question-reply.entity';

@Injectable()
export class VoteService {
  constructor(
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(QuestionReply)
    private questionRepliesRepository: Repository<QuestionReply>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async upvote(userParams: User, upvoteDto: UpvoteDto) {
    if (!upvoteDto.questionId && !upvoteDto.replyId) {
      throw new BadRequestException('Either questionId or replyId is required');
    }
    if (upvoteDto.questionId && upvoteDto.replyId) {
      throw new BadRequestException('Either questionId or replyId is required');
    }

    const user = await this.userRepository.findOne({
      where: { id: userParams.id },
    });

    let question: Question, questionReply: QuestionReply;

    if (upvoteDto.questionId) {
      question = await this.questionRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const question = await transactionalEntityManager.findOne(Question, {
            where: { id: upvoteDto.questionId },
            relations: ['upvoters'],
            loadEagerRelations: true,
          });

          if (!question) {
            throw new BadRequestException('Question not found');
          }

          question.upvoters = question.upvoters.filter(
            (upvoter) => upvoter.id !== user.id,
          );

          if (upvoteDto.isUpvote) {
            question.upvoters.push(user);
          }

          question.vote = question.upvoters.length;

          await transactionalEntityManager.save(question);

          return transactionalEntityManager.findOne(Question, {
            where: { id: upvoteDto.questionId },
            relations: [
              'upvoters',
              'owner',
              'files',
              'replies',
              'replies.owner',
              'replies.upvoters',
            ],
            loadEagerRelations: true,
          });
        },
      );
    }

    if (upvoteDto.replyId) {
      questionReply = await this.questionRepliesRepository.manager.transaction(
        async (transactionalEntityManager) => {
          const questionReply = await transactionalEntityManager.findOne(
            QuestionReply,
            {
              where: { id: upvoteDto.replyId },
              relations: ['upvoters'],
              loadEagerRelations: true,
            },
          );

          if (!questionReply) {
            throw new BadRequestException('Question reply not found');
          }

          questionReply.upvoters = questionReply.upvoters.filter(
            (upvoter) => upvoter.id !== user.id,
          );

          if (upvoteDto.isUpvote) {
            questionReply.upvoters.push(user);
          }

          questionReply.vote = questionReply.upvoters.length;

          await transactionalEntityManager.save(questionReply);

          return transactionalEntityManager.findOne(QuestionReply, {
            where: { id: upvoteDto.replyId },
            relations: ['question', 'question.owner', 'owner', 'upvoters'],
            loadEagerRelations: true,
          });
        },
      );
    }

    return {
      question: question
        ? TrimmedQuestionMapper.fromQuestion(question, user)
        : null,
      questionReply: questionReply
        ? TrimmedQuestionReplyMapper.fromQuestionReply(questionReply, user)
        : null,
    };
  }

  async getPost(id: string, user: User) {
    const question = await this.questionRepository.findOne({
      where: {
        upvoters: {
          id: user.id,
        },
        id,
      },
      relations: ['upvoters'],
    });

    return {
      voted: !!question,
    };
  }
}
