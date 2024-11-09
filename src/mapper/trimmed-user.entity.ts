import { User } from '../user/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { PunishmentStatus } from '../admin/entities/user-status.entity';

export interface TrimmedUser
  extends Omit<
    User,
    | 'password'
    | 'createdAt'
    | 'updatedAt'
    | 'forgotPasswordToken'
    | 'refreshToken'
    | 'verificationToken'
    | 'notifications'
    | 'blockedUsers'
    | 'blockedByUsers'
    | 'ownedGroups'
    | 'userGroup'
    | 'questions'
    | 'questionsToThisUser'
    | 'followUser'
    | 'followedUser'
    | 'followGroup'
    | 'replies'
    | 'upvotedReplies'
    | 'upvotedQuestions'
    | 'reports'
    | 'reported'
    | 'vip'
  > {
  vip: boolean;
}

export class TrimmedUserMapper implements TrimmedUser {
  acceptQuestion: boolean;
  birthday: Date;
  email: string;
  id: string;
  name: string;
  role: string;
  username: string;
  verifiedAt: Date;
  profilePicture: string;
  status: PunishmentStatus;
  vip: boolean;

  static configService: ConfigService = new ConfigService();

  static fromUser(user: User): TrimmedUser {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      birthday: user.birthday,
      name: user.name,
      role: user.role,
      verifiedAt: user.verifiedAt,
      acceptQuestion: user.acceptQuestion,
      profilePicture: user.profilePicture,
      status: user.status,
      vip: user.vip?.paymentStatus === 'SUCCESS',
    };
  }

  static fromUserList(users: User[]): TrimmedUser[] {
    return users.map((user) => this.fromUser(user));
  }
}
