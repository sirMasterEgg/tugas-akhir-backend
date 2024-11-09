import { UserRoleEnum } from '../../enums/user-role.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { VerificationToken } from '../../auth/entities/verification-token.entity';
import { ForgotPasswordToken } from '../../auth/entities/forgot-password-token.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { Notification } from './notification.entity';
import { Group } from '../../group/entities/group.entity';
import { UserGroup } from '../../group/entities/user-group.entity';
import { Question } from './question.entity';
import { FollowedGroup } from '../../group/entities/followed-group.entity';
import { BlockedUser } from './blocked-user.entity';
import { QuestionReply } from '../../question-reply/entities/question-reply.entity';
import { Report } from '../../report/entities/report.entity';
import { ReportUser } from '../../report/entities/report-user.entity';
import { PunishmentStatus } from '../../admin/entities/user-status.entity';
import { Vip } from '../../vip/entities/vip.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    nullable: false,
  })
  name: string;
  @Column({
    unique: true,
    nullable: false,
  })
  email: string;

  @Column({
    nullable: false,
  })
  password: string;

  @Column({
    unique: true,
    nullable: false,
  })
  username: string;

  @Column({ type: 'date', nullable: false })
  birthday: Date;

  @Column({
    type: 'enum',
    enum: UserRoleEnum,
    nullable: false,
  })
  role: string;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  verifiedAt: Date;

  @Column({
    type: 'boolean',
    default: true,
    nullable: false,
  })
  acceptQuestion: boolean;

  @Column({
    nullable: true,
  })
  profilePicture: string;

  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(
    () => VerificationToken,
    (verificationToken) => verificationToken.user,
  )
  verificationToken: VerificationToken;

  @OneToMany(() => ForgotPasswordToken, (forgotPassword) => forgotPassword.user)
  forgotPasswordToken: ForgotPasswordToken;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshToken: RefreshToken;

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => BlockedUser, (blockedUser) => blockedUser.user)
  blockedUsers: BlockedUser[];

  @OneToMany(() => BlockedUser, (blockedUser) => blockedUser.blockedUser)
  blockedByUsers: BlockedUser[];

  @ManyToMany(() => User, (user) => user.followedUser)
  @JoinTable({
    name: 'followed-users',
    joinColumn: {
      name: 'userId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'followedUserId',
      referencedColumnName: 'id',
    },
  })
  followUser: User[];

  @ManyToMany(() => User, (user) => user.followUser)
  followedUser: User[];

  @OneToMany(() => Group, (group) => group.owner)
  ownedGroups: Group[];

  @OneToMany(() => UserGroup, (userGroup) => userGroup.user)
  userGroup: UserGroup[];

  @OneToMany(() => Question, (question) => question.owner)
  questions: Question[];

  @OneToMany(() => Question, (question) => question.targetUser)
  questionsToThisUser: Question[];

  @OneToMany(() => FollowedGroup, (followedGroup) => followedGroup.user)
  followGroup: FollowedGroup[];

  @OneToMany(() => QuestionReply, (questionReply) => questionReply.owner)
  replies: QuestionReply[];

  @ManyToMany(() => QuestionReply, (reply) => reply.upvoters)
  upvotedReplies: QuestionReply[];

  @ManyToMany(() => Question, (question) => question.upvoters)
  upvotedQuestions: Question[];

  @OneToMany(() => Report, (report) => report.reporter)
  reports: Report[];

  @OneToMany(() => ReportUser, (reportUser) => reportUser.user)
  reported: ReportUser[];

  @OneToOne(() => PunishmentStatus, (status) => status.user, {
    eager: true,
  })
  status: PunishmentStatus;

  @OneToOne(() => Vip, (vip) => vip.user, {
    eager: true,
  })
  vip: Vip;
}
