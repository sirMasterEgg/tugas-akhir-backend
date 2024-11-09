import { TrimmedUser } from '../../../mapper/trimmed-user.entity';

export class GetCurrentUserResponseDto {
  user: CurrentUser;
}

interface CurrentUser extends TrimmedUser {
  totalFollowers: number;
  totalQuestions: number;
  totalUpVotes: number;
}
