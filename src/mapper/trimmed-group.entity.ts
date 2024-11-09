import { Group } from '../group/entities/group.entity';

export interface TrimmedGroup
  extends Omit<
    Group,
    | 'createdAt'
    | 'updatedAt'
    | 'owner'
    | 'userGroups'
    | 'questions'
    | 'followers'
  > {}

export class TrimmedGroupMapper implements TrimmedGroup {
  id: string;
  name: string;
  identifier: string;

  static fromGroup(group: Group): TrimmedGroup {
    return {
      id: group.id,
      identifier: group.identifier,
      name: group.name,
    };
  }

  static fromGroupList(groups: Group[]): TrimmedGroup[] {
    return groups.map((group) => this.fromGroup(group));
  }
}
