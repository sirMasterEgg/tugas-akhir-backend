import { Test, TestingModule } from '@nestjs/testing';
import { NotificationObserverService } from './notification-observer.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from '../user/entities/notification.entity';
import { In, Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { PostWsGateway } from '../post-ws/post-ws.gateway';
import { NotificationObserverDto } from './dto/NotificationObserverDto';
import { WsMessage } from '../post-ws/enums/ws-message.enum';

describe('NotificationObserverService', () => {
  let service: NotificationObserverService;
  let notificationRepository: Repository<Notification>;
  let userRepository: Repository<User>;
  let wsGateway: PostWsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationObserverService,
        {
          provide: getRepositoryToken(Notification),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: PostWsGateway,
          useValue: {
            server: {
              to: jest.fn().mockReturnThis(),
              emit: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<NotificationObserverService>(
      NotificationObserverService,
    );
    notificationRepository = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    wsGateway = module.get<PostWsGateway>(PostWsGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleNotificationCreatedEvent', () => {
    const payload: NotificationObserverDto = {
      room: ['user1', 'user2'],
      notification: {
        title: 'Test Title',
        message: 'Test Message',
      },
    };

    it('should create notifications for each user and emit via WebSocket', async () => {
      const users = [{ id: 'user1' } as User, { id: 'user2' } as User];
      jest.spyOn(userRepository, 'find').mockResolvedValue(users);
      jest
        .spyOn(notificationRepository, 'save')
        .mockImplementation(async (notifications) => notifications as any);

      await service.handleNotificationCreatedEvent(payload);

      expect(userRepository.find).toHaveBeenCalledWith({
        where: { id: In(payload.room) },
      });
      expect(notificationRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            title: 'Test Title',
            message: 'Test Message',
            read: false,
            user: users[0],
          }),
          expect.objectContaining({
            title: 'Test Title',
            message: 'Test Message',
            read: false,
            user: users[1],
          }),
        ]),
      );
      expect(wsGateway.server.to).toHaveBeenCalledWith('user1');
      expect(wsGateway.server.emit).toHaveBeenCalledWith(
        WsMessage.NOTIFICATION,
        expect.any(Notification),
      );
      expect(wsGateway.server.to).toHaveBeenCalledWith('user2');
      expect(wsGateway.server.emit).toHaveBeenCalledWith(
        WsMessage.NOTIFICATION,
        expect.any(Notification),
      );
    });

    it('should not save or emit notifications if no users found', async () => {
      jest.spyOn(userRepository, 'find').mockResolvedValue([]);
      const saveSpy = jest.spyOn(notificationRepository, 'save');

      await service.handleNotificationCreatedEvent(payload);

      expect(saveSpy).not.toHaveBeenCalled();
      expect(wsGateway.server.to).not.toHaveBeenCalled();
      expect(wsGateway.server.emit).not.toHaveBeenCalled();
    });
  });
});
