import { TrimmedUser } from '../../../mapper/trimmed-user.entity';

export class GetSingleGroupResponseDto {
  group: SingleGroupResponseDto;
}
class SingleGroupResponseDto {
  id: string;
  name: string;
  identifier: string;
  owner: TrimmedUser;
  members: Member[];
}
interface Member extends TrimmedUser {
  joinedAt: Date;
  current: boolean;
}
