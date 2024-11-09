import { TrimmedUser } from '../../../mapper/trimmed-user.entity';
import { TrimmedGroup } from '../../../mapper/trimmed-group.entity';
import { TrimmedQuestionReply } from '../../../mapper/question-reply.entity';
import { MetadataDto } from '../../../mapper/metadata-mapper.entity';

export class GetQuestionsResponseDto {
  questions: QuestionDto[];
  meta: MetadataDto;
}
class QuestionDto {
  id: string;
  question: string;
  anonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
  owner?: TrimmedUser;
  targetUser?: TrimmedUser;
  targetGroup?: TrimmedGroup;
  files: FilesReferenceDto[];
  replies: TrimmedQuestionReply[];
}

class FilesReferenceDto {
  id: string;
  url: string;
}
