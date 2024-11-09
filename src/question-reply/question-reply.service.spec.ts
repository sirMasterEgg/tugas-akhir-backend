import { Test, TestingModule } from '@nestjs/testing';
import { QuestionReplyService } from './question-reply.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuestionReply } from './entities/question-reply.entity';
import { Repository } from 'typeorm';
import { Question } from '../user/entities/question.entity';
import { User } from '../user/entities/user.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateQuestionReplyDto } from './dto/create-question-reply.dto';
import { Events } from '../post-ws/enums/ws-message.enum';
import { NotificationObserverDto } from '../notification-observer/dto/NotificationObserverDto';
import { NotFoundException } from '@nestjs/common';

describe('QuestionReplyService', () => {
  let service: QuestionReplyService;
  let questionReplyRepository: Repository<QuestionReply>;
  let questionRepository: Repository<Question>;
  let userRepository: Repository<User>;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionReplyService,
        {
          provide: getRepositoryToken(QuestionReply),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Question),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<QuestionReplyService>(QuestionReplyService);
    questionReplyRepository = module.get<Repository<QuestionReply>>(
      getRepositoryToken(QuestionReply),
    );
    questionRepository = module.get<Repository<Question>>(
      getRepositoryToken(Question),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('create', () => {
    it('should throw NotFoundException if question is not found', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ id: 'user1' } as User);
      jest.spyOn(questionRepository, 'findOne').mockResolvedValue(null);

      const createDto: CreateQuestionReplyDto = {
        content: 'Sample answer',
        anonymous: false,
      };

      await expect(
        service.create({ id: 'user1' } as User, 'invalid-post-id', createDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create and save a new question reply', async () => {
      const mockUser = { id: 'user1', username: 'testuser' } as User;
      const mockQuestion = {
        id: 'question1',
        owner: { id: 'user2' },
      } as Question;
      const mockReply = {
        id: 'reply1',
        content: 'Sample answer',
        upvoters: [],
        owner: { id: '1' },
      } as QuestionReply;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(questionRepository, 'findOne').mockResolvedValue(mockQuestion);
      jest.spyOn(questionReplyRepository, 'save').mockResolvedValue(mockReply);
      jest
        .spyOn(questionReplyRepository, 'findOne')
        .mockResolvedValue(mockReply);

      const createDto: CreateQuestionReplyDto = {
        content: 'Sample answer',
        anonymous: false,
      };
      const result = await service.create(mockUser, 'question1', createDto);

      expect(result).toBeTruthy();
      expect(result.content).toEqual('Sample answer');
    });

    it('should emit a notification event when a reply is created', async () => {
      const mockUser = { id: 'user1', username: 'testuser' } as User;
      const mockQuestion = {
        id: 'question1',
        owner: { id: 'user2' },
      } as Question;
      const mockReply = {
        id: 'reply1',
        content: 'Sample answer',
        upvoters: [],
        owner: { id: '1' },
      } as QuestionReply;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(questionRepository, 'findOne').mockResolvedValue(mockQuestion);
      jest.spyOn(questionReplyRepository, 'save').mockResolvedValue(mockReply);
      jest
        .spyOn(questionReplyRepository, 'findOne')
        .mockResolvedValue(mockReply);

      const createDto: CreateQuestionReplyDto = {
        content: 'Sample answer',
        anonymous: false,
      };
      await service.create(mockUser, 'question1', createDto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        Events.NOTIFICATION_CREATED,
        NotificationObserverDto.forNewAnswer({
          room: [mockQuestion.owner.id],
          responderUsername: mockUser.username,
          answer: createDto.content,
        }),
      );
    });
  });
});
