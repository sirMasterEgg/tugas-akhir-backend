import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { VipService } from './vip.service';
import { AuthWithRoles } from '../auth/auth.decorator';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { WebhookDto } from './dto/webhook.dto';
import { HttpStatusCode } from 'axios';

@Controller('vip')
export class VipController {
  constructor(private readonly vipService: VipService) {}

  @AuthWithRoles('user')
  @Post('pay')
  pay(@CurrentUser() user: User) {
    return this.vipService.pay(user);
  }

  @Post('webhook')
  @HttpCode(HttpStatusCode.Ok)
  webhook(@Body() body: WebhookDto) {
    return this.vipService.webhook(body);
  }
}
