import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('forgot-password-tokens')
export class ForgotPasswordToken {
  @Column({
    primary: true,
    type: 'varchar',
    length: 500,
  })
  token: string;

  @Column({
    nullable: false,
  })
  expiresAt: Date;

  @ManyToOne(() => User, (user) => user.forgotPasswordToken)
  user: User;

  @BeforeInsert()
  setExpirationDate() {
    this.expiresAt = new Date();
    this.expiresAt.setMinutes(this.expiresAt.getMinutes() + 5);
  }

  @CreateDateColumn()
  createdAt: Date;
}
