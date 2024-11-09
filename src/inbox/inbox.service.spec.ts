import { Test, TestingModule } from '@nestjs/testing';
import { InboxService } from './inbox.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Question } from '../user/entities/question.entity';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { NotFoundException } from '@nestjs/common';

describe('InboxService', () => {
  let service: InboxService;
  let questionRepository: Repository<Question>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxService,
        {
          provide: getRepositoryToken(Question),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<InboxService>(InboxService);
    questionRepository = module.get<Repository<Question>>(
      getRepositoryToken(Question),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return questions with "all" filter', async () => {
      const user = { id: 'user1' } as User;
      const questions = [
        {
          id: 'q1',
          question: 'test',
          upvoters: [],
          owner: { id: '1' },
          files: [],
          replies: [],
        },
      ] as Question[];
      jest
        .spyOn(questionRepository, 'findAndCount')
        .mockResolvedValue([questions, 1]);

      const result = await service.findAll('all', 1, 10, user);

      expect(result.questions.length).toBe(1);
      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.totalPage).toBe(1);
    });

    it('should return questions with "me" filter', async () => {
      const user = { id: 'user1' } as User;
      const questions = [
        {
          id: 'q1',
          targetUser: { id: user.id },
          question: 'test',
          upvoters: [],
          owner: { id: '1' },
          files: [],
          replies: [],
        },
      ] as Question[];
      jest
        .spyOn(questionRepository, 'findAndCount')
        .mockResolvedValue([questions, 1]);

      const result = await service.findAll('me', 1, 10, user);

      expect(result.questions.length).toBe(1);
      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.totalPage).toBe(1);
    });

    it('should return questions with "group" filter', async () => {
      const user = { id: 'user1' } as User;
      const questions = [
        {
          id: 'q1',
          targetGroup: { followers: [{ userId: user.id }] },
          question: 'test',
          upvoters: [],
          owner: { id: '1' },
          files: [],
          replies: [],
        },
      ] as Question[];
      jest
        .spyOn(questionRepository, 'findAndCount')
        .mockResolvedValue([questions, 1]);

      const result = await service.findAll('group', 1, 10, user);

      expect(result.questions.length).toBe(1);
      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.totalPage).toBe(1);
    });

    it('should apply pagination correctly', async () => {
      const user = { id: 'user1' } as User;
      const questions = Array(10).fill({
        id: 'q1',
        question: 'test',
        upvoters: [],
        owner: { id: '1' },
        files: [],
        replies: [],
      }) as Question[];
      jest
        .spyOn(questionRepository, 'findAndCount')
        .mockResolvedValue([questions, 20]);

      const result = await service.findAll('all', 2, 10, user);

      expect(result.questions.length).toBe(10);
      expect(result.meta.currentPage).toBe(2);
      expect(result.meta.totalPage).toBe(2);
    });

    it('should default to page 1 if page is not provided or invalid', async () => {
      const user = { id: 'user1' } as User;
      const questions = [
        {
          id: 'q1',
          question: 'test',
          upvoters: [],
          owner: { id: '1' },
          files: [],
          replies: [],
        },
      ] as Question[];
      jest
        .spyOn(questionRepository, 'findAndCount')
        .mockResolvedValue([questions, 1]);

      const result = await service.findAll('all', 0, 10, user);

      expect(result.meta.currentPage).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return the question by id', async () => {
      const user = { id: 'user1' } as User;
      const question = {
        id: 'q1',
        owner: { id: 'owner1' },
        question: 'test',
        upvoters: [],
        files: [],
        replies: [],
      } as Question;
      jest.spyOn(questionRepository, 'findOne').mockResolvedValue(question);

      const result = await service.findOne('q1', user);

      expect(result.question.id).toBe('q1');
      expect(result.question.owner.id).toBe('owner1');
    });

    it('should throw NotFoundException if question not found', async () => {
      const user = { id: 'user1' } as User;
      jest.spyOn(questionRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('q1', user)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
