import { PartialType } from '@nestjs/swagger';
import { AddAdminDto } from './add-admin.dto';

export class UpdateAdminDto extends PartialType(AddAdminDto) {}
