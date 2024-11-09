import { TrimmedQuestion } from '../../../mapper/question.entity';
import { MetadataDto } from '../../../mapper/metadata-mapper.entity';

export class GetInboxResponseDto {
  questions: TrimmedQuestion[];
  meta: MetadataDto;
}
