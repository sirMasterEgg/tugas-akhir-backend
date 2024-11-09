import { Test, TestingModule } from '@nestjs/testing';
import { PostWsService } from './post-ws.service';
import { Repository } from 'typeorm';
import { Question } from '../user/entities/question.entity';
import { User } from '../user/entities/user.entity';
import { Group } from '../group/entities/group.entity';
import { FilesReference } from '../user/entities/files-reference.entity';
import { FileService } from '../file/file.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationObserverDto } from '../notification-observer/dto/NotificationObserverDto';
import { Events } from './enums/ws-message.enum';
import { CreatePostWDto } from './dto/create-post-w.dto';
import { WsException } from '@nestjs/websockets';

describe('PostWsService', () => {
  let service: PostWsService;
  let questionRepository: Repository<Question>;
  let userRepository: Repository<User>;
  let groupRepository: Repository<Group>;
  let fileReferenceRepository: Repository<FilesReference>;
  let fileService: FileService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostWsService,
        {
          provide: getRepositoryToken(Question),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Group),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(FilesReference),
          useClass: Repository,
        },
        {
          provide: FileService,
          useValue: {
            saveFile: jest.fn().mockResolvedValue('file.jpg'),
          },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PostWsService>(PostWsService);
    questionRepository = module.get<Repository<Question>>(
      getRepositoryToken(Question),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    groupRepository = module.get<Repository<Group>>(getRepositoryToken(Group));
    fileReferenceRepository = module.get<Repository<FilesReference>>(
      getRepositoryToken(FilesReference),
    );
    fileService = module.get<FileService>(FileService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('askQuestion', () => {
    it('should throw WsException if neither user nor group is found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(null);

      const askDto: CreatePostWDto = {
        userId: 'invalidUser',
        groupId: 'invalidGroup',
        content: 'Test question',
      } as CreatePostWDto;

      await expect(
        service.askQuestion({ id: 'user1' } as User, askDto),
      ).rejects.toThrow(WsException);
    });

    it('should save question with files if files are provided', async () => {
      const mockUser = { id: 'user1' } as User;
      const mockQuestion = {
        id: 'question1',
        owner: mockUser,
        question: 'test',
        upvoters: [],
        files: [],
        replies: [],
      } as Question;

      const askDto: CreatePostWDto = {
        content: 'Test question',
        files: ['base64encodedfile'],
      } as CreatePostWDto;

      jest.spyOn(questionRepository, 'save').mockResolvedValue(mockQuestion);
      jest.spyOn(questionRepository, 'findOne').mockResolvedValue(mockQuestion);
      jest
        .spyOn(fileReferenceRepository, 'save')
        .mockResolvedValue([{ fileName: 'file.jpg' } as FilesReference] as any);

      const result = await service.askQuestion(mockUser, askDto);

      expect(fileService.saveFile).toHaveBeenCalled();
      expect(fileReferenceRepository.save).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });

    it('should emit notification event for a personal question', async () => {
      const mockUser = { id: 'user1', name: 'testuser' } as User;
      const targetUser = { id: 'targetUser1' } as User;
      const mockQuestion = {
        id: 'question1',
        owner: mockUser,
        targetUser,
        question: 'Test question',
        upvoters: [],
        files: [],
        replies: [],
      } as Question;

      const askDto: CreatePostWDto = {
        userId: 'targetUser1',
        content: 'Test question',
      } as CreatePostWDto;
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(targetUser);
      jest.spyOn(questionRepository, 'save').mockResolvedValue(mockQuestion);
      jest.spyOn(questionRepository, 'findOne').mockResolvedValue(mockQuestion);

      await service.askQuestion(mockUser, askDto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        Events.NOTIFICATION_CREATED,
        NotificationObserverDto.forPersonalQuestion({
          room: [targetUser.id],
          askerUsername: 'testuser',
          question: 'Test question',
        }),
      );
    });

    it('should emit notification event for a group question', async () => {
      const mockUser = { id: 'user1', name: 'testuser' } as User;
      const targetGroup = {
        id: 'group1',
        name: 'Test Group',
        userGroups: [{ userId: 'groupUser1' }, { userId: 'groupUser2' }],
      } as Group;
      const mockQuestion = {
        id: 'question1',
        owner: mockUser,
        targetGroup,
        question: 'Test question',
        upvoters: [],
        files: [],
        replies: [],
      } as Question;

      const askDto: CreatePostWDto = {
        groupId: 'group1',
        content: 'Test question',
      } as CreatePostWDto;
      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(targetGroup);
      jest.spyOn(questionRepository, 'save').mockResolvedValue(mockQuestion);
      jest.spyOn(questionRepository, 'findOne').mockResolvedValue(mockQuestion);

      await service.askQuestion(mockUser, askDto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        Events.NOTIFICATION_CREATED,
        NotificationObserverDto.forGroupQuestion({
          room: targetGroup.userGroups.map((userGroup) => userGroup.userId),
          groupName: 'Test Group',
          askerUsername: 'testuser',
          question: 'Test question',
        }),
      );
    });
  });
});
