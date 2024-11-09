import { User } from '../../user/entities/user.entity';

export class RefreshTokenResponseDto {
  user: Pick<
    User,
    | 'id'
    | 'username'
    | 'email'
    | 'birthday'
    | 'name'
    | 'role'
    | 'verifiedAt'
    | 'acceptQuestion'
  >;
  accessToken: string;
}
