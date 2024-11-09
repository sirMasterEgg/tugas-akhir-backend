import { TrimmedUser } from '../../mapper/trimmed-user.entity';

export class LoginResponseDto {
  user: TrimmedUser;
  accessToken: string;
  refreshToken: string;
}
