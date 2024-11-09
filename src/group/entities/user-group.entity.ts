import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Group } from './group.entity';

@Entity('user-groups')
export class UserGroup {
  @PrimaryColumn()
  userId: string;
  @PrimaryColumn()
  groupId: string;

  @ManyToOne(() => User, (user) => user.userGroup)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Group, (group) => group.userGroups)
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Column({ type: 'datetime', nullable: false })
  joinedAt: Date;
}
