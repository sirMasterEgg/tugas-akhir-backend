import { Injectable } from '@nestjs/common';
import { PostWsGateway } from '../post-ws/post-ws.gateway';
import { NotificationObserverDto } from './dto/NotificationObserverDto';
import { WsMessage } from '../post-ws/enums/ws-message.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification } from '../user/entities/notification.entity';
import { In, Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';

@Injectable()
export class NotificationObserverService {
  constructor(
    private readonly wsGateway: PostWsGateway,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async handleNotificationCreatedEvent(payload: NotificationObserverDto) {
    const users = await this.userRepository.find({
      where: {
        id: In(payload.room),
      },
    });

    const notifications = users.map((user) => {
      const notification = new Notification();
      notification.title = payload.notification.title;
      notification.message = payload.notification.message;
      notification.read = false;
      notification.user = user;

      return notification;
    });

    if (!notifications.length) {
      return;
    }

    const result = await this.notificationRepository.save(notifications);

    result.forEach((notification) => {
      this.wsGateway.server
        .to(notification.user.id)
        .emit(WsMessage.NOTIFICATION, notification);
    });
  }
}
