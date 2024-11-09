import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Group } from './group.entity';

@Entity('followed-groups')
export class FollowedGroup {
  @PrimaryColumn()
  userId: string;
  @PrimaryColumn()
  groupId: string;

  @ManyToOne(() => User, (user) => user.followUser)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Group, (group) => group.followers)
  @JoinColumn({ name: 'groupId' })
  group: Group;
}
