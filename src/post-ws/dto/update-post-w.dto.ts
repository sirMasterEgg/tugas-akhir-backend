import { PartialType } from '@nestjs/mapped-types';
import { CreatePostWDto } from './create-post-w.dto';

export class UpdatePostWDto extends PartialType(CreatePostWDto) {
  id: number;
}
