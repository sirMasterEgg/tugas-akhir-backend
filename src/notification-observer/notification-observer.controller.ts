import { Controller } from '@nestjs/common';
import { NotificationObserverService } from './notification-observer.service';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationObserverDto } from './dto/NotificationObserverDto';
import { Events } from '../post-ws/enums/ws-message.enum';

@Controller()
export class NotificationObserverController {
  constructor(
    private readonly notificationObserverService: NotificationObserverService,
  ) {}

  @OnEvent(Events.NOTIFICATION_CREATED)
  handleNotificationCreatedEvent(payload: NotificationObserverDto) {
    this.notificationObserverService.handleNotificationCreatedEvent(payload);
  }
}
