import { Module } from '@nestjs/common';
import { NotificationObserverService } from './notification-observer.service';
import { NotificationObserverController } from './notification-observer.controller';
import { PostWsModule } from '../post-ws/post-ws.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../user/entities/notification.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User]), PostWsModule],
  controllers: [NotificationObserverController],
  providers: [NotificationObserverService],
})
export class NotificationObserverModule {}
