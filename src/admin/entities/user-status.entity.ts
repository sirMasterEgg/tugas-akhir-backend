import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum UserPunishmentStatusEnum {
  BANNED = 'BANNED',
  WARNED = 'WARNED',
  TIMEOUT = 'TIMEOUT',
}

@Entity('punishment-status')
export class PunishmentStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: UserPunishmentStatusEnum,
    nullable: false,
  })
  userStatus: UserPunishmentStatusEnum;

  @Column({
    type: 'datetime',
    nullable: false,
  })
  expired: Date;

  @OneToOne(() => User, (user) => user.status)
  @JoinColumn()
  user: User;
}
