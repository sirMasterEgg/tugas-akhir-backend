import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { VoteService } from './vote.service';
import { AuthWithRoles } from '../auth/auth.decorator';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { UpvoteDto } from './dto/upvote.dto';

@AuthWithRoles('user')
@Controller('vote')
export class VoteController {
  constructor(private readonly voteService: VoteService) {}

  @Post('upvote')
  upvote(@CurrentUser() user: User, @Body() upvoteDto: UpvoteDto) {
    return this.voteService.upvote(user, upvoteDto);
  }

  @Get('post/:id')
  getVoteStatusPost(@Param('id') id: string, @CurrentUser() user: User) {
    return this.voteService.getPost(id, user);
  }
}
