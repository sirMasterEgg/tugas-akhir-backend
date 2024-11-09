import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('refresh-tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    type: 'longtext',
    unique: false,
  })
  token: string;

  @ManyToOne(() => User, (user) => user.refreshToken)
  user: User;
}
