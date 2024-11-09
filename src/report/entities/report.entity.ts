import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ReportUser } from './report-user.entity';

export enum ReportType {
  USER = 'user',
  CONTENT = 'content',
}
export enum ReportedPostType {
  QUESTION = 'question',
  REPLY = 'reply',
}

export enum ReportStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
}

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ReportType,
    nullable: false,
  })
  reportType: ReportType;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  reportStatus: ReportStatus;

  @Column({
    nullable: true,
  })
  reportedPostId?: string;

  @Column({
    type: 'enum',
    enum: ReportedPostType,
    nullable: true,
  })
  reportedPostType?: ReportedPostType;

  @ManyToOne(() => User, (user) => user.reports)
  reporter: User;

  @OneToOne(() => ReportUser, (user) => user.report)
  reportedUser: ReportUser;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
