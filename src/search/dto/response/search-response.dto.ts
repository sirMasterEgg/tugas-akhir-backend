import { TrimmedUserMapper } from '../../../mapper/trimmed-user.entity';
import { TrimmedGroupMapper } from '../../../mapper/trimmed-group.entity';
import { User } from '../../../user/entities/user.entity';
import { Group } from '../../../group/entities/group.entity';

export class SearchResponseDto {
  results: (SearchUser | SearchGroup)[];
}
export class SearchUser extends TrimmedUserMapper {
  type: 'user';

  static fromUserList(users: User[]): SearchUser[] {
    return users.map((user) => {
      return {
        ...TrimmedUserMapper.fromUser(user),
        type: 'user',
      };
    });
  }
}
export class SearchGroup extends TrimmedGroupMapper {
  type: 'group';

  static fromGroupList(groups: Group[]): SearchGroup[] {
    return groups.map((group) => {
      return {
        ...TrimmedGroupMapper.fromGroup(group),
        type: 'group',
      };
    });
  }
}
