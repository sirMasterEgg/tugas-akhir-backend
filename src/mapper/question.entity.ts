import { Question } from '../user/entities/question.entity';
import { TrimmedUser, TrimmedUserMapper } from './trimmed-user.entity';
import { FileMapper, Files } from './file-mapper.entity';
import { TrimmedGroup, TrimmedGroupMapper } from './trimmed-group.entity';
import {
  TrimmedQuestionReply,
  TrimmedQuestionReplyMapper,
} from './question-reply.entity';
import { BadWord } from '../validator/content-filtering.validator';
import { User } from '../user/entities/user.entity';

export interface TrimmedQuestion
  extends Omit<
    Question,
    'owner' | 'targetGroup' | 'targetUser' | 'files' | 'replies' | 'upvoters'
  > {
  owner?: TrimmedUser;
  targetUser?: TrimmedUser;
  targetGroup?: TrimmedGroup;
  files: Files[];
  replies: TrimmedQuestionReply[];
  voted: boolean;
}

export class TrimmedQuestionMapper implements TrimmedQuestion {
  static fromQuestion(question: Question, user: User): TrimmedQuestion {
    return {
      id: question.id,
      question: BadWord.masking(question.question),
      anonymous: question.anonymous,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
      vote: question.vote,
      voted: question.upvoters.some((upvoter) => upvoter.id === user.id),
      ...(question.anonymous
        ? {}
        : {
            owner: TrimmedUserMapper.fromUser(question.owner),
          }),
      ...(question.targetUser
        ? {
            targetUser: TrimmedUserMapper.fromUser(question.targetUser),
          }
        : {}),
      ...(question.targetGroup
        ? {
            targetGroup: TrimmedGroupMapper.fromGroup(question.targetGroup),
          }
        : {}),
      files: FileMapper.fromFileList(question.files),
      replies: TrimmedQuestionReplyMapper.fromQuestionReplyList(
        question.replies.sort((a, b) => {
          // First, compare by votes in descending order
          if (b.vote !== a.vote) {
            return b.vote - a.vote;
          }
          // If votes are equal, compare by createdAt date in descending order
          return b.createdAt.getTime() - a.createdAt.getTime();
        }),
        user,
      ),
    };
  }

  static fromQuestionList(
    questions: Question[],
    user: User,
  ): TrimmedQuestion[] {
    return questions.map((question) => this.fromQuestion(question, user));
  }

  anonymous: boolean;
  createdAt: Date;
  files: Files[];
  id: string;
  question: string;
  replies: TrimmedQuestionReply[];
  updatedAt: Date;
  vote: number;
  voted: boolean;
}
