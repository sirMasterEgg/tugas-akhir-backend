import { IsAlphanumeric, IsEmail, IsString } from 'class-validator';

export class AddAdminDto {
  @IsString()
  @IsAlphanumeric()
  name: string;

  @IsString()
  @IsAlphanumeric()
  username: string;

  @IsEmail()
  email: string;

  password: string;
  key: string;
}
