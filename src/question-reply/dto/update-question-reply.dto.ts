import { PartialType } from '@nestjs/mapped-types';
import { CreateQuestionReplyDto } from './create-question-reply.dto';

export class UpdateQuestionReplyDto extends PartialType(CreateQuestionReplyDto) {}
