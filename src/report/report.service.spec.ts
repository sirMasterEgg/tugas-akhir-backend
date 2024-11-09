import { Test, TestingModule } from '@nestjs/testing';
import { ReportService } from './report.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { EntityManager, Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { QuestionReply } from '../question-reply/entities/question-reply.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { BadRequestException } from '@nestjs/common';

describe('ReportService', () => {
  let service: ReportService;
  let userRepo: Repository<User>;
  let reportRepo: Repository<Report>;
  let questionReplyRepo: Repository<QuestionReply>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Report),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            manager: {
              transaction: jest.fn((cb) => {
                cb({
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
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    reportRepo = module.get<Repository<Report>>(getRepositoryToken(Report));
    questionReplyRepo = module.get<Repository<QuestionReply>>(
      getRepositoryToken(QuestionReply),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create report', () => {
    it('should throw an error if no userId, postId, or replyId is provided', async () => {
      const createReportDto: CreateReportDto = {};
      const user = { id: '1' } as User;

      userRepo.findOne = jest.fn().mockReturnValue(user);

      await expect(service.create(createReportDto, user)).rejects.toThrow(
        new BadRequestException('User or post id is required'),
      );
    });

    it('should throw an error if both userId, postId, and replyId are provided', async () => {
      const createReportDto: CreateReportDto = {
        userId: '1',
        postId: '2',
        replyId: '3',
      };
      const user = { id: '1' } as User;

      userRepo.findOne = jest.fn().mockReturnValue(user);

      await expect(service.create(createReportDto, user)).rejects.toThrow(
        new BadRequestException('You can only report either a user or a post'),
      );
    });

    it('should throw an error if a user tries to report themselves', async () => {
      const createReportDto: CreateReportDto = { userId: '1' };
      const user = { id: '1' } as User;

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(user);

      await expect(service.create(createReportDto, user)).rejects.toThrow(
        new BadRequestException('You cannot report yourself'),
      );
    });

    it('should throw BadRequestException if user or post or reply not found', async () => {
      const dto = { userId: 'user2' } as CreateReportDto;
      jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);

      await expect(service.create(dto, { id: '1' } as User)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create a report for a userId', async () => {
      const createReportDto: CreateReportDto = { userId: '2' };
      const user = { id: '1' } as User;
      const reportedUser = { id: '2' } as User;

      jest.spyOn(userRepo, 'findOne').mockResolvedValueOnce(user); // For currentUser
      jest.spyOn(userRepo, 'findOne').mockResolvedValueOnce(reportedUser); // For reportedUser

      const mockEntityManager = {
        queryRunner: {
          manager: {
            findOne: jest.fn().mockResolvedValueOnce({ id: '1' } as Report),
            save: jest.fn(),
          },
        },
        save: jest.fn(),
      } as unknown as EntityManager;

      reportRepo.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager))
        .mockReturnValue({ id: '1' });

      const result = await service.create(createReportDto, user);
      expect(result.message).toBe(
        'Report created successfully with report id 1',
      );
    });

    it('should create a report for a postId', async () => {
      const createReportDto: CreateReportDto = { postId: '2' };
      const user = { id: '1' } as User;
      const reportedUser = { id: '2', questions: [{ id: '2' }] } as User;

      jest.spyOn(userRepo, 'findOne').mockResolvedValueOnce(user); // For currentUser
      jest.spyOn(userRepo, 'findOne').mockResolvedValueOnce(reportedUser); // For reportedUser

      const mockEntityManager = {
        queryRunner: {
          manager: {
            findOne: jest.fn().mockResolvedValueOnce({ id: '1' } as Report),
            save: jest.fn(),
          },
        },
        save: jest.fn(),
      } as unknown as EntityManager;

      reportRepo.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager))
        .mockReturnValue({ id: '1' });

      const result = await service.create(createReportDto, user);
      expect(result.message).toBe(
        'Report created successfully with report id 1',
      );
    });

    it('should create a report for a replyId', async () => {
      const createReportDto: CreateReportDto = { replyId: '3' };
      const user = { id: '1' } as User;
      const reportedReply = {
        id: '3',
        owner: { id: '2' } as User,
      } as QuestionReply;

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(user); // For currentUser
      jest.spyOn(questionReplyRepo, 'findOne').mockResolvedValue(reportedReply);

      const mockEntityManager = {
        queryRunner: {
          manager: {
            findOne: jest.fn().mockResolvedValueOnce({ id: '1' } as Report),
            save: jest.fn(),
          },
        },
        save: jest.fn(),
      } as unknown as EntityManager;

      reportRepo.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager))
        .mockReturnValue({ id: '1' });

      const result = await service.create(createReportDto, user);
      expect(result.message).toBe(
        'Report created successfully with report id 1',
      );
    });
  });
});
