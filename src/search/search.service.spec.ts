import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { User } from '../user/entities/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Group } from '../group/entities/group.entity';

describe('SearchService', () => {
  let service: SearchService;
  let userRepository: Repository<User>;
  let groupRepository: Repository<Group>;
  let elasticSearchService: ElasticsearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Group),
          useClass: Repository,
        },
        {
          provide: ElasticsearchService,
          useValue: {
            search: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    groupRepository = module.get<Repository<Group>>(getRepositoryToken(Group));
    elasticSearchService =
      module.get<ElasticsearchService>(ElasticsearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should return an empty array when query is empty', async () => {
      const result = await service.search('', {} as User);
      expect(result.results).toEqual([]);
    });

    it('should return users and groups matching the query', async () => {
      const query = 'test';
      const mockUser = { id: '1', username: 'testUser' } as User;
      const mockGroup = { id: '1', identifier: 'test-group' } as Group;

      jest.spyOn(userRepository, 'find').mockResolvedValue([mockUser]);
      jest.spyOn(groupRepository, 'find').mockResolvedValue([mockGroup]);

      const result = await service.search(query, {
        username: 'currentUser',
      } as User);

      expect(result.results).toHaveLength(2);
    });
  });

  describe('searchUser', () => {
    it('should return paginated user search results from Elasticsearch', async () => {
      const mockUser = { id: 'user1', username: 'searchUser' } as User;
      const username = 'search';
      const page = 1;
      const size = 5;

      jest.spyOn(elasticSearchService, 'search').mockResolvedValue({
        hits: { hits: [{ _source: mockUser }] },
      } as any);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(elasticSearchService, 'count')
        .mockResolvedValue({ count: 10 } as any);

      const result = await service.searchUser(username, page, size, {
        id: 'currentUserId',
        username: 'currentUser',
      } as User);

      expect(result.users).toHaveLength(1);
      expect(result.meta.currentPage).toBe(page);
      expect(result.meta.totalPage).toBe(2);
    });

    it('should handle pagination with missing page or size', async () => {
      const mockUser = {
        id: 'userId',
      } as User;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(elasticSearchService, 'search').mockResolvedValue({
        hits: { hits: [] },
      } as any);
      jest
        .spyOn(elasticSearchService, 'count')
        .mockResolvedValue({ count: 0 } as any);

      const result = await service.searchUser('username', null, null, mockUser);

      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.totalPage).toBe(1);
      expect(result.meta.nextPage).toBe(null);
    });
  });

  describe('searchGroup', () => {
    it('should return paginated group search results', async () => {
      const query = 'group';
      const page = 1;
      const size = 5;
      const mockGroup = {
        id: 'group1',
        identifier: 'group-identifier',
      } as Group;

      jest
        .spyOn(groupRepository, 'findAndCount')
        .mockResolvedValue([[mockGroup], 10]);

      const result = await service.searchGroup(query, page, size);

      expect(result.groups).toHaveLength(1);
      expect(result.meta.currentPage).toBe(page);
      expect(result.meta.totalPage).toBe(2);
    });

    it('should handle pagination with default page and size values', async () => {
      jest.spyOn(groupRepository, 'findAndCount').mockResolvedValue([[], 0]);

      const result = await service.searchGroup('group', null, null);

      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.totalPage).toBe(1);
      expect(result.meta.nextPage).toBe(null);
    });
  });
});
