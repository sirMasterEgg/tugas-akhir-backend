import { TrimmedUser } from '../../../mapper/trimmed-user.entity';
import { TrimmedGroupMapper } from '../../../mapper/trimmed-group.entity';

export class CreateGroupResponseDto extends TrimmedGroupMapper {
  // id: string;
  // name: string;
  // identifier: string;
  owner: TrimmedUser;
  members: Member[];
}

interface Member extends TrimmedUser {
  joinedAt: Date;
}
