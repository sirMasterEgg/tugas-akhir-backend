import { QuestionReply } from '../question-reply/entities/question-reply.entity';
import { TrimmedUserMapper } from './trimmed-user.entity';
import { User } from '../user/entities/user.entity';

export interface TrimmedQuestionReply
  extends Omit<QuestionReply, 'owner' | 'question' | 'upvoters'> {
  owner?: TrimmedUserMapper;
  vote: number;
  voted: boolean;
}

export class TrimmedQuestionReplyMapper implements TrimmedQuestionReply {
  content: string;
  createdAt: Date;
  id: string;
  updatedAt: Date;
  anonymous: boolean;
  vote: number;
  voted: boolean;

  static fromQuestionReply(
    reply: QuestionReply,
    user: User,
  ): TrimmedQuestionReply {
    return {
      id: reply.id,
      content: reply.content,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
      anonymous: reply.anonymous,
      vote: reply.vote,
      voted: reply.upvoters.some((upvoter) => upvoter.id === user.id),
      ...(reply.anonymous
        ? {}
        : {
            owner: TrimmedUserMapper.fromUser(reply.owner),
          }),
    };
  }

  static fromQuestionReplyList(
    replies: QuestionReply[],
    user: User,
  ): TrimmedQuestionReply[] {
    return replies.map((reply) => this.fromQuestionReply(reply, user));
  }
}
