import { Controller, Get, Param, Query } from '@nestjs/common';
import { InboxService } from './inbox.service';
import { AuthWithRoles } from '../auth/auth.decorator';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../user/entities/user.entity';

@AuthWithRoles('user')
@Controller('inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get()
  findAll(
    @Query('filter') filter: string,
    @Query('page') page: string,
    @Query('size') size: string,
    @CurrentUser() user: User,
  ) {
    return this.inboxService.findAll(filter, +page, +size, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.inboxService.findOne(id, user);
  }
}
