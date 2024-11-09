import { TrimmedUser } from '../../../mapper/trimmed-user.entity';
import { TrimmedGroup } from '../../../mapper/trimmed-group.entity';

export class FollowResponseDto {
  userFollowing: TrimmedUser[];
  groupFollowing: TrimmedGroup[];
}
