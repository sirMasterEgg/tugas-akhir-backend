import { Test, TestingModule } from '@nestjs/testing';
import { VoteService } from './vote.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Question } from '../user/entities/question.entity';
import { QuestionReply } from '../question-reply/entities/question-reply.entity';
import { User } from '../user/entities/user.entity';
import { BadRequestException } from '@nestjs/common';
import { UpvoteDto } from './dto/upvote.dto';

describe('VoteService', () => {
  let service: VoteService;
  let questionRepository: Repository<Question>;
  let questionRepliesRepository: Repository<QuestionReply>;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoteService,
        {
          provide: getRepositoryToken(Question),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            manager: {
              findOne: jest.fn(),
              save: jest.fn(),
              transaction: jest.fn((cb) => {
                cb({
                  findOne: jest.fn(),
                  save: jest.fn(),
                  queryRunner: {
                    manager: {
                      findOne: jest.fn(),
                      save: jest.fn(),
                    },
                  },
                });
              }),
            },
          },
        },
        {
          provide: getRepositoryToken(QuestionReply),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            manager: {
              findOne: jest.fn(),
              save: jest.fn(),
              transaction: jest.fn((cb) => {
                cb({
                  findOne: jest.fn(),
                  save: jest.fn(),
                  queryRunner: {
                    manager: {
                      findOne: jest.fn(),
                      save: jest.fn(),
                    },
                  },
                });
              }),
            },
          },
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<VoteService>(VoteService);
    questionRepository = module.get<Repository<Question>>(
      getRepositoryToken(Question),
    );
    questionRepliesRepository = module.get<Repository<QuestionReply>>(
      getRepositoryToken(QuestionReply),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upvote', () => {
    it('should throw if neither questionId nor replyId is provided', async () => {
      await expect(
        service.upvote(
          { id: 'user1' } as User,
          { isUpvote: true } as UpvoteDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if both questionId and replyId are provided', async () => {
      await expect(
        service.upvote({ id: 'user1' } as User, {
          isUpvote: true,
          questionId: 'q1',
          replyId: 'r1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upvote a question if valid questionId is provided', async () => {
      const mockUser = { id: 'user1' } as User;
      const mockQuestion = {
        id: 'q1',
        upvoters: [],
        vote: 0,
        question: 'test',
        owner: { id: '1' },
        files: [],
        replies: [],
      } as Question;

      const mockEntityManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockQuestion)
          .mockResolvedValueOnce(mockQuestion),
        save: jest.fn().mockResolvedValue({ ...mockQuestion }),
        queryRunner: {
          manager: {
            findOne: jest.fn().mockResolvedValueOnce(mockQuestion),
            save: jest.fn().mockResolvedValue({ ...mockQuestion }),
          },
        },
      } as unknown as EntityManager;

      questionRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.upvote(mockUser, {
        questionId: 'q1',
        isUpvote: true,
      } as UpvoteDto);

      expect(result.question).toBeTruthy();
    });

    it('should remove upvote if already upvoted', async () => {
      const mockUser = { id: 'user1' } as User;
      const mockQuestion = {
        id: 'q1',
        upvoters: [mockUser],
        vote: 0,
        question: 'test',
        owner: { id: '1' },
        files: [],
        replies: [],
      } as Question;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const mockEntityManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockQuestion)
          .mockResolvedValueOnce(mockQuestion),
        save: jest.fn().mockResolvedValue({ ...mockQuestion }),
        queryRunner: {
          manager: {
            findOne: jest.fn().mockResolvedValueOnce(mockQuestion),
            save: jest.fn().mockResolvedValue({ ...mockQuestion }),
          },
        },
      } as unknown as EntityManager;

      questionRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      const result = await service.upvote(mockUser, {
        questionId: 'q1',
        isUpvote: false,
      } as UpvoteDto);

      expect(result.question).toBeTruthy();
      expect(result.question.vote).toBe(0);
    });

    it('should throw if question not found', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ id: 'user1' } as User);

      const mockEntityManager = {
        findOne: jest.fn().mockResolvedValueOnce(null),
        queryRunner: {
          manager: {
            findOne: jest.fn().mockResolvedValueOnce(null),
          },
        },
      } as unknown as EntityManager;

      questionRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      await expect(
        service.upvote(
          { id: 'user1' } as User,
          {
            questionId: 'q1',
            isUpvote: true,
          } as UpvoteDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upvote a reply if valid replyId is provided', async () => {
      const mockUser = { id: 'user1' } as User;
      const mockReply = {
        id: 'r1',
        upvoters: [],
        vote: 0,
        owner: { id: '1' },
      } as QuestionReply;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const mockEntityManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockReply)
          .mockResolvedValueOnce(mockReply),
        save: jest.fn().mockResolvedValue({ ...mockReply }),
        queryRunner: {
          manager: {
            findOne: jest.fn().mockResolvedValueOnce(mockReply),
            save: jest.fn().mockResolvedValue({ ...mockReply }),
          },
        },
      } as unknown as EntityManager;

      questionRepliesRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      const result = await service.upvote(mockUser, {
        replyId: 'r1',
        isUpvote: true,
      } as UpvoteDto);

      expect(result.questionReply).toBeTruthy();
      expect(result.questionReply.vote).toBe(1);
    });

    it('should throw if reply not found', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ id: 'user1' } as User);

      const mockEntityManager = {
        findOne: jest.fn().mockResolvedValueOnce(null),
        queryRunner: {
          manager: {
            findOne: jest.fn().mockResolvedValueOnce(null),
          },
        },
      } as unknown as EntityManager;

      questionRepliesRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      await expect(
        service.upvote(
          { id: 'user1' } as User,
          {
            replyId: 'r1',
            isUpvote: true,
          } as UpvoteDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPost', () => {
    it('should return true if user has upvoted the question', async () => {
      const mockUser = { id: 'user1' } as User;
      const mockQuestion = { id: 'q1', upvoters: [mockUser] } as Question;

      jest.spyOn(questionRepository, 'findOne').mockResolvedValue(mockQuestion);

      const result = await service.getPost('q1', mockUser);

      expect(result.voted).toBe(true);
    });

    it('should return false if user has not upvoted the question', async () => {
      jest.spyOn(questionRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getPost('q1', { id: 'user1' } as User);

      expect(result.voted).toBe(false);
    });
  });
});
