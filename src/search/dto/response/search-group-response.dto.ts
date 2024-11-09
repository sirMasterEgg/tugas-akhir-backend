import { TrimmedGroup } from '../../../mapper/trimmed-group.entity';
import { MetadataDto } from '../../../mapper/metadata-mapper.entity';

export class SearchGroupResponseDto {
  groups: TrimmedGroup[];
  meta: MetadataDto;
}
