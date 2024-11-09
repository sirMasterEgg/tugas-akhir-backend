import { IsAlphanumeric, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsAlphanumeric()
  username: string;

  password: string;
}
