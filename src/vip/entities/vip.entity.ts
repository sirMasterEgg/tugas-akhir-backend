import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('vip')
export class Vip {
  @PrimaryColumn({
    type: 'varchar',
    length: 32,
  })
  id: string;

  @Column({
    nullable: true,
  })
  token: string;

  @Column()
  paymentStatus: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CREATED';

  @Column({
    nullable: true,
  })
  paymentDate: Date;

  @OneToOne(() => User, (user) => user.vip)
  @JoinColumn()
  user: User;
}
