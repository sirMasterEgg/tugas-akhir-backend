import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('verification-tokens')
export class VerificationToken {
  @Column({
    primary: true,
  })
  token: string;

  @OneToOne(() => User, (user) => user.verificationToken)
  @JoinColumn()
  user: User;

  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
}
