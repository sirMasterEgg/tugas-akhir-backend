import { TrimmedUser } from '../../../mapper/trimmed-user.entity';
import { MetadataDto } from '../../../mapper/metadata-mapper.entity';

export class SearchUserResponseDto {
  users: TrimmedUser[];
  meta: MetadataDto;
}
