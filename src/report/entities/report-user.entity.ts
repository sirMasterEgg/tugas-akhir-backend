import {
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Report } from './report.entity';
import { User } from '../../user/entities/user.entity';

@Entity('reports-user')
export class ReportUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  userId: string;
  reportId: string;

  @ManyToOne(() => User, (user) => user.reported)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToOne(() => Report, (report) => report.reportedUser)
  @JoinColumn({ name: 'reportId' })
  report: Report;
}
