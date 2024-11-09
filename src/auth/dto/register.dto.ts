import {
  IsAlphanumeric,
  IsEmail,
  IsString,
  Length,
  Validate,
} from 'class-validator';
import { ValidStringDate } from '../../validator/string-date.validator';

export class RegisterDto {
  @IsString()
  @IsAlphanumeric()
  name: string;

  @IsString()
  @IsAlphanumeric()
  username: string;

  @Length(8)
  password: string;

  @IsEmail()
  email: string;

  @Validate(ValidStringDate)
  birthday: string;
}
