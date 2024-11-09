import { Length } from 'class-validator';

export class ResetPasswordDto {
  @Length(8)
  password: string;
}
