import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { EntityManager, Repository } from 'typeorm';
import {
  Report,
  ReportedPostType,
  ReportStatus,
} from '../report/entities/report.entity';
import { PunishmentStatus } from './entities/user-status.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import { Question } from '../user/entities/question.entity';
import { QuestionReply } from '../question-reply/entities/question-reply.entity';

describe('AdminService', () => {
  let service: AdminService;
  let userRepository: Repository<User>;
  let reportRepository: Repository<Report>;
  let punishmentStatusRepository: Repository<PunishmentStatus>;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Report),
          useValue: {
            findAndCount: jest.fn(),
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
          provide: getRepositoryToken(PunishmentStatus),
          useClass: Repository,
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    reportRepository = module.get<Repository<Report>>(
      getRepositoryToken(Report),
    );
    punishmentStatusRepository = module.get<Repository<PunishmentStatus>>(
      getRepositoryToken(PunishmentStatus),
    );
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Get all user', () => {
    it('should return all users with pagination', async () => {
      const mockUsers = [new User(), new User()]; // Mock user data
      const mockCount = 2;
      userRepository.findAndCount = jest
        .fn()
        .mockResolvedValueOnce([mockUsers, mockCount]);

      const result = await service.getAllUsers(1, 10, 'all', '');

      expect(result.users).toEqual(expect.any(Array));
      expect(result.meta.currentPage).toEqual(1);
      expect(result.meta.totalPage).toEqual(1);
    });

    it('should throw BadRequestException for invalid filter', async () => {
      await expect(service.getAllUsers(1, 10, 'invalid', '')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('do Action On Users', () => {
    it('should ban a user', async () => {
      const mockUser = new User();
      mockUser.id = '1';
      userRepository.findOne = jest.fn().mockResolvedValueOnce(mockUser);

      punishmentStatusRepository.findOne = jest.fn().mockResolvedValue(null);

      const punishmentStatus = new PunishmentStatus();
      punishmentStatusRepository.save = jest
        .fn()
        .mockResolvedValueOnce(punishmentStatus);

      const resultBan = await service.doActionOnUsers({
        action: 'ban',
        userId: '1',
      });

      expect(resultBan.message).toBe('User banned');
    });

    it('should warn a user', async () => {
      const mockUser = new User();
      mockUser.id = '1';
      userRepository.findOne = jest.fn().mockResolvedValueOnce(mockUser);

      punishmentStatusRepository.findOne = jest.fn().mockResolvedValue(null);

      const punishmentStatus = new PunishmentStatus();
      punishmentStatusRepository.save = jest
        .fn()
        .mockResolvedValueOnce(punishmentStatus);

      const resultWarn = await service.doActionOnUsers({
        action: 'warn',
        userId: '1',
      });

      expect(resultWarn.message).toBe('User warned');
    });

    it('should timeout a user', async () => {
      const mockUser = new User();
      mockUser.id = '1';
      userRepository.findOne = jest.fn().mockResolvedValueOnce(mockUser);

      punishmentStatusRepository.findOne = jest.fn().mockResolvedValue(null);

      const punishmentStatus = new PunishmentStatus();
      punishmentStatusRepository.save = jest
        .fn()
        .mockResolvedValueOnce(punishmentStatus);

      const resultTimeout = await service.doActionOnUsers({
        action: 'timeout',
        userId: '1',
      });

      expect(resultTimeout.message).toBe('User timeout');
    });

    it('should unban a user', async () => {
      const mockUser = new User();
      mockUser.id = '1';
      userRepository.findOne = jest.fn().mockResolvedValueOnce(mockUser);

      const mockedDelete = {
        id: '1',
      };
      punishmentStatusRepository.findOne = jest
        .fn()
        .mockResolvedValue(mockedDelete);

      punishmentStatusRepository.delete = jest
        .fn()
        .mockResolvedValueOnce(mockedDelete);

      const result = await service.doActionOnUsers({
        action: 'unban',
        userId: '1',
      });

      expect(result.message).toBe('User unbanned');
    });

    it('should throw BadRequestException when action invalid', async () => {
      const mockUser = new User();
      mockUser.id = '1';
      userRepository.findOne = jest.fn().mockResolvedValueOnce(mockUser);

      punishmentStatusRepository.findOne = jest
        .fn()
        .mockResolvedValue(mockUser);

      const punishmentStatus = new PunishmentStatus();
      punishmentStatusRepository.save = jest
        .fn()
        .mockResolvedValueOnce(punishmentStatus);

      await expect(
        service.doActionOnUsers({
          action: 'tes' as any,
          userId: '1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not remove punishment to a user', async () => {
      const mockUser = new User();
      mockUser.id = '1';
      userRepository.findOne = jest.fn().mockResolvedValueOnce(mockUser);

      punishmentStatusRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.doActionOnUsers({
          action: 'unban',
          userId: '1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user not found', async () => {
      userRepository.findOne = jest.fn().mockResolvedValueOnce(null);

      await expect(
        service.doActionOnUsers({ action: 'ban', userId: '1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('get Reports', () => {
    it('should return reports with pagination', async () => {
      const mockReports = [
        { id: '1', reporter: { id: '1' }, reportedUser: { user: { id: '2' } } },
        { id: '2', reporter: { id: '1' }, reportedUser: { user: { id: '2' } } },
      ];
      const mockCount = 2;
      reportRepository.findAndCount = jest
        .fn()
        .mockResolvedValueOnce([mockReports, mockCount]);

      const result = await service.getReports(1, 10, 'all', '');

      expect(result.reports).toHaveLength(2);
      expect(result.meta.currentPage).toEqual(1);
      expect(result.meta.totalPage).toEqual(1);
    });

    it('should throw BadRequestException for invalid filter', async () => {
      await expect(service.getReports(1, 10, 'invalid', '')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('doActionOnReports', () => {
    it('should resolve report and apply timeout', async () => {
      const mockReport = {
        id: '1',
        reportStatus: ReportStatus.PENDING,
        reportedUser: { user: { id: '1' } },
      };

      const mockEntityManager = {
        queryRunner: {
          manager: {
            findOne: jest.fn().mockResolvedValueOnce(mockReport),
            save: jest.fn(),
          },
        },
      } as unknown as EntityManager;

      reportRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      service.doActionOnUsers = jest
        .fn()
        .mockResolvedValueOnce({ message: 'User timeout' });

      await expect(
        service.doActionOnReports({
          action: 'timeout',
          reportId: '1',
        }),
      ).resolves.toEqual({
        message: 'Successfully resolved report',
      });
    });

    it('should resolve report and apply warn', async () => {
      const mockReport = {
        id: '1',
        reportStatus: ReportStatus.PENDING,
        reportedUser: { user: { id: '1' } },
      };

      const mockEntityManager = {
        queryRunner: {
          manager: {
            findOne: jest.fn().mockResolvedValueOnce(mockReport),
            save: jest.fn(),
          },
        },
      } as unknown as EntityManager;

      reportRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      service.doActionOnUsers = jest
        .fn()
        .mockResolvedValueOnce({ message: 'User warned' });

      await expect(
        service.doActionOnReports({
          action: 'warn',
          reportId: '1',
        }),
      ).resolves.toEqual({
        message: 'Successfully resolved report',
      });
    });

    it('should resolve report and apply ban', async () => {
      const mockReport = {
        id: '1',
        reportStatus: ReportStatus.PENDING,
        reportedUser: { user: { id: '1' } },
      };

      const mockEntityManager = {
        queryRunner: {
          manager: {
            findOne: jest.fn().mockResolvedValueOnce(mockReport),
            save: jest.fn(),
          },
        },
      } as unknown as EntityManager;

      reportRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      service.doActionOnUsers = jest
        .fn()
        .mockResolvedValueOnce({ message: 'User banned' });

      await expect(
        service.doActionOnReports({
          action: 'ban',
          reportId: '1',
        }),
      ).resolves.toEqual({
        message: 'Successfully resolved report',
      });
    });

    it('should resolve report and apply reject', async () => {
      const mockReport = {
        id: '1',
        reportStatus: ReportStatus.PENDING,
        reportedUser: { user: { id: '1' } },
      };

      const mockEntityManager = {
        queryRunner: {
          manager: {
            findOne: jest.fn().mockResolvedValueOnce(mockReport),
            save: jest.fn(),
          },
        },
      } as unknown as EntityManager;

      reportRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      await expect(
        service.doActionOnReports({
          action: 'reject',
          reportId: '1',
        }),
      ).resolves.toEqual({
        message: 'Successfully resolved report',
      });
    });

    it('should throw BadRequestException due to invalid action', async () => {
      const mockReport = {
        id: '1',
        reportStatus: ReportStatus.PENDING,
        reportedUser: { user: { id: '1' } },
      };

      const mockEntityManager = {
        queryRunner: {
          manager: {
            findOne: jest.fn().mockResolvedValueOnce(mockReport),
            save: jest.fn(),
          },
        },
      } as unknown as EntityManager;

      reportRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      service.doActionOnUsers = jest
        .fn()
        .mockResolvedValueOnce({ message: 'User banned' });

      await expect(
        service.doActionOnReports({
          action: 'tes' as any,
          reportId: '1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if report not found', async () => {
      const mockEntityManager = {
        queryRunner: {
          manager: {
            findOne: jest.fn().mockResolvedValueOnce(null),
            save: jest.fn(),
          },
        },
      } as unknown as EntityManager;

      reportRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      await expect(
        service.doActionOnReports({ action: 'reject', reportId: '1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if report resolve or reject', async () => {
      const mockEntityManager = {
        queryRunner: {
          manager: {
            findOne: jest.fn().mockResolvedValueOnce({
              id: '1',
              reportStatus: ReportStatus.RESOLVED,
              reportedUser: { user: { id: '1' } },
            }),
            save: jest.fn(),
          },
        },
      } as unknown as EntityManager;

      reportRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      await expect(
        service.doActionOnReports({ action: 'reject', reportId: '1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('get report preview', () => {
    it('should return question data when report type is QUESTION', async () => {
      const reportId = 'report-1';
      const mockReport: Report = {
        id: reportId,
        reportStatus: ReportStatus.PENDING,
        reportedPostType: ReportedPostType.QUESTION,
        reportedPostId: 'question-1',
        // Add other necessary fields if required
      } as unknown as Report;

      const mockQuestion: Question = {
        id: 'question-1',
        files: [], // Mock files if necessary
        // Add other necessary fields if required
      } as unknown as Question;

      const mockEntityManager = {
        queryRunner: {
          manager: {
            findOne: jest
              .fn()
              .mockResolvedValueOnce(mockReport)
              .mockResolvedValueOnce(mockQuestion),
          },
        },
      } as unknown as EntityManager;

      // Mock the transaction to execute the callback with the mockEntityManager
      reportRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (runInTransaction) =>
          runInTransaction(mockEntityManager),
        );

      const result = await service.getReportPreview(reportId);

      expect(reportRepository.manager.transaction).toHaveBeenCalled();
      expect(
        mockEntityManager.queryRunner.manager.findOne,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockEntityManager.queryRunner.manager.findOne,
      ).toHaveBeenNthCalledWith(1, Report, {
        where: { id: reportId },
      });
      expect(
        mockEntityManager.queryRunner.manager.findOne,
      ).toHaveBeenNthCalledWith(2, Question, {
        where: { id: mockReport.reportedPostId },
        relations: ['files'],
      });
      expect(result).toEqual({
        question: mockQuestion,
        reply: undefined,
      });
    });

    it('should return reply data when report type is REPLY', async () => {
      const reportId = 'report-2';
      const mockReport: Report = {
        id: reportId,
        reportStatus: ReportStatus.PENDING,
        reportedPostType: ReportedPostType.REPLY,
        reportedPostId: 'reply-1',
      } as unknown as Report;

      const mockReply: QuestionReply = {
        id: 'reply-1',
      } as unknown as QuestionReply;

      const mockEntityManager = {
        queryRunner: {
          manager: {
            findOne: jest
              .fn()
              .mockResolvedValueOnce(mockReport)
              .mockResolvedValueOnce(mockReply),
          },
        },
      } as unknown as EntityManager;

      reportRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (runInTransaction) =>
          runInTransaction(mockEntityManager),
        );

      const result = await service.getReportPreview(reportId);

      expect(reportRepository.manager.transaction).toHaveBeenCalled();
      expect(
        mockEntityManager.queryRunner.manager.findOne,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockEntityManager.queryRunner.manager.findOne,
      ).toHaveBeenNthCalledWith(1, Report, {
        where: { id: reportId },
      });
      expect(
        mockEntityManager.queryRunner.manager.findOne,
      ).toHaveBeenNthCalledWith(2, QuestionReply, {
        where: { id: mockReport.reportedPostId },
      });
      expect(result).toEqual({
        question: undefined,
        reply: mockReply,
      });
    });

    it('should throw BadRequestException if report is not found', async () => {
      const reportId = 'non-existent-report';

      const mockEntityManager = {
        queryRunner: {
          manager: {
            findOne: jest.fn().mockResolvedValueOnce(null),
          },
        },
      } as unknown as EntityManager;

      reportRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (runInTransaction) =>
          runInTransaction(mockEntityManager),
        );

      await expect(service.getReportPreview(reportId)).rejects.toThrow(
        new BadRequestException('Report not found'),
      );

      expect(reportRepository.manager.transaction).toHaveBeenCalled();
      expect(
        mockEntityManager.queryRunner.manager.findOne,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockEntityManager.queryRunner.manager.findOne,
      ).toHaveBeenCalledWith(Report, {
        where: { id: reportId },
      });
    });

    it('should handle case where reported Question is not found', async () => {
      const reportId = 'report-3';
      const mockReport: Report = {
        id: reportId,
        reportStatus: ReportStatus.PENDING,
        reportedPostType: ReportedPostType.QUESTION,
        reportedPostId: 'question-2',
        // Add other necessary fields if required
      } as unknown as Report;

      const mockEntityManager = {
        queryRunner: {
          manager: {
            findOne: jest
              .fn()
              .mockResolvedValueOnce(mockReport)
              .mockResolvedValueOnce(null),
          },
        },
      } as unknown as EntityManager;

      reportRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (runInTransaction) =>
          runInTransaction(mockEntityManager),
        );

      const result = await service.getReportPreview(reportId);

      expect(reportRepository.manager.transaction).toHaveBeenCalled();
      expect(
        mockEntityManager.queryRunner.manager.findOne,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockEntityManager.queryRunner.manager.findOne,
      ).toHaveBeenNthCalledWith(1, Report, {
        where: { id: reportId },
      });
      expect(
        mockEntityManager.queryRunner.manager.findOne,
      ).toHaveBeenNthCalledWith(2, Question, {
        where: { id: mockReport.reportedPostId },
        relations: ['files'],
      });
      expect(result).toEqual({
        question: null, // Depending on your implementation, it might be undefined or throw an error
        reply: undefined,
      });
    });

    it('should handle case where reported Reply is not found', async () => {
      const reportId = 'report-4';
      const mockReport: Report = {
        id: reportId,
        reportStatus: ReportStatus.PENDING,
        reportedPostType: ReportedPostType.REPLY,
        reportedPostId: 'reply-2',
        // Add other necessary fields if required
      } as unknown as Report;

      const mockEntityManager = {
        queryRunner: {
          manager: {
            findOne: jest
              .fn()
              .mockResolvedValueOnce(mockReport)
              .mockResolvedValueOnce(null),
          },
        },
      } as unknown as EntityManager;

      reportRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (runInTransaction) =>
          runInTransaction(mockEntityManager),
        );

      const result = await service.getReportPreview(reportId);

      expect(reportRepository.manager.transaction).toHaveBeenCalled();
      expect(
        mockEntityManager.queryRunner.manager.findOne,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockEntityManager.queryRunner.manager.findOne,
      ).toHaveBeenNthCalledWith(1, Report, {
        where: { id: reportId },
      });
      expect(
        mockEntityManager.queryRunner.manager.findOne,
      ).toHaveBeenNthCalledWith(2, QuestionReply, {
        where: { id: mockReport.reportedPostId },
      });
      expect(result).toEqual({
        question: undefined,
        reply: null, // Depending on your implementation, it might be undefined or throw an error
      });
    });
  });
});
