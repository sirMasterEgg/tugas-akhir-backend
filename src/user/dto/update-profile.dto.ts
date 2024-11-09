import { PartialType } from '@nestjs/mapped-types';
import { RegisterDto } from '../../auth/dto/register.dto';

export class UpdateProfileDto extends PartialType(RegisterDto) {
  profilePicture: string;
}
