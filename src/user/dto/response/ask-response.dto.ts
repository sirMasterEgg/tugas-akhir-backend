import { TrimmedQuestion } from '../../../mapper/question.entity';
import { Files } from '../../../mapper/file-mapper.entity';
import { TrimmedQuestionReply } from '../../../mapper/question-reply.entity';

export class AskResponseDto implements TrimmedQuestion {
  anonymous: boolean;
  createdAt: Date;
  files: Files[];
  id: string;
  question: string;
  vote: number;
  replies: TrimmedQuestionReply[];
  updatedAt: Date;
  voted: boolean;
}
