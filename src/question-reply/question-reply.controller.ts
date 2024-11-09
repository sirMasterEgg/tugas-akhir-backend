import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common';
import { QuestionReplyService } from './question-reply.service';
import { CreateQuestionReplyDto } from './dto/create-question-reply.dto';
import { UpdateQuestionReplyDto } from './dto/update-question-reply.dto';
import { AuthWithRoles } from '../auth/auth.decorator';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../user/entities/user.entity';

@AuthWithRoles('user')
@Controller('reply/:postId')
export class QuestionReplyController {
  constructor(private readonly questionReplyService: QuestionReplyService) {}

  @Post()
  create(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
    @Body() createQuestionReplyDto: CreateQuestionReplyDto,
  ) {
    return this.questionReplyService.create(
      user,
      postId,
      createQuestionReplyDto,
    );
  }

  @Patch(':replyId')
  update(
    @Param('replyId') replyId: string,
    @Param('postId') postId: string,
    @Body() updateQuestionReplyDto: UpdateQuestionReplyDto,
  ) {
    return this.questionReplyService.update(
      replyId,
      postId,
      updateQuestionReplyDto,
    );
  }

  @Delete(':replyId')
  remove(@Param('replyId') replyId: string, @Param('postId') postId: string) {
    return this.questionReplyService.remove(replyId, postId);
  }
}
