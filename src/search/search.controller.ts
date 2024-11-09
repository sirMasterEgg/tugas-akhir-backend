import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { AuthWithRoles } from '../auth/auth.decorator';

@AuthWithRoles('user')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query('q') query: string, @CurrentUser() user: User) {
    return this.searchService.search(query, user);
  }

  @Get('user')
  searchUser(
    @Query('username') username: string,
    @Query('page') page: string,
    @Query('size') size: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.searchService.searchUser(username, +page, +size, currentUser);
  }

  @Get('group')
  searchGroup(
    @Query('q') query: string,
    @Query('page') page: string,
    @Query('size') size: string,
  ) {
    return this.searchService.searchGroup(query, +page, +size);
  }
}
