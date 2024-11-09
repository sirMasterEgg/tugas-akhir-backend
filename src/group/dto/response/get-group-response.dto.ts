import { TrimmedUser } from '../../../mapper/trimmed-user.entity';

export class GetGroupResponseDto {
  groups: GetSingleGroupResponseDto[];
}

interface GetSingleGroupResponseDto {
  id: string;
  name: string;
  identifier: string;
  owner: TrimmedUser;
  members: Member[];
}

interface Member extends TrimmedUser {
  joinedAt: Date;
}
