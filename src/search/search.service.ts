import { Injectable } from '@nestjs/common';
import { User } from '../user/entities/user.entity';
import { And, ILike, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Group } from '../group/entities/group.entity';
import {
  SearchGroup,
  SearchResponseDto,
  SearchUser,
} from './dto/response/search-response.dto';
import { SearchUserResponseDto } from './dto/response/search-user-response.dto';
import { TrimmedUserMapper } from '../mapper/trimmed-user.entity';
import { MetadataMapper } from '../mapper/metadata-mapper.entity';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { TrimmedGroupMapper } from '../mapper/trimmed-group.entity';
import { SearchGroupResponseDto } from './dto/response/search-group-response.dto';

@Injectable()
export class SearchService {
  private readonly elasticsearchIndex: string = 'dbserver1.tugas_akhir.users';

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    private readonly elasticSearchService: ElasticsearchService,
  ) {}

  async search(query: string, user: User): Promise<SearchResponseDto> {
    if (!query) {
      return { results: [] };
    }
    const users = await this.userRepository.find({
      where: {
        username: And(Not(user.username), ILike(`%${query}%`)),
      },
    });
    const groups = await this.groupRepository.find({
      where: {
        identifier: ILike(`%${query.toLowerCase().replace(/\s/, '-')}%`),
      },
    });
    return {
      results: [
        ...SearchUser.fromUserList(users),
        ...SearchGroup.fromGroupList(groups),
      ],
    };
  }

  async searchUser(
    username: string,
    page: number,
    size: number,
    currentUser: User,
  ): Promise<SearchUserResponseDto> {
    if (!page || page < 1) page = 1;
    const take: number = size || 5;
    const skip = (page - 1) * take;

    const currentUserQuery = await this.userRepository.findOne({
      where: {
        id: currentUser.id,
      },
    });

    let shouldQuery = {};
    if (username) {
      shouldQuery = {
        should: [
          {
            wildcard: {
              username: `${username}*`,
            },
          },
          {
            fuzzy: {
              username: {
                value: username,
              },
            },
          },
        ],
      };
    }

    const [result, total] = await Promise.all([
      this.elasticSearchService.search<User>({
        index: this.elasticsearchIndex,
        size: take,
        from: skip,
        query: {
          bool: {
            ...shouldQuery,
            must: [
              {
                term: {
                  role: currentUserQuery.role,
                },
              },
            ],
            must_not: [
              {
                term: {
                  username: currentUserQuery.username,
                },
              },
            ],
          },
        },
      }),
      this.elasticSearchService.count({
        index: this.elasticsearchIndex,
        query: {
          bool: {
            ...shouldQuery,
            must: [
              {
                term: {
                  role: currentUserQuery.role, // Ensure users have the same role as the current user
                },
              },
            ],
            must_not: [
              {
                term: {
                  username: currentUserQuery.username,
                },
              },
            ],
          },
        },
      }),
    ]);

    return {
      users: result.hits.hits.map((hit) =>
        TrimmedUserMapper.fromUser(hit._source),
      ),
      meta: MetadataMapper.fromMetadata({
        page,
        totalPage: Math.ceil(total.count / take),
      }),
    };
  }

  async searchGroup(
    query: string,
    page: number,
    size: number,
  ): Promise<SearchGroupResponseDto> {
    if (!page || page < 1) page = 1;
    const take: number = size || 5;
    const skip = (page - 1) * take;

    let condition = {};

    if (query) {
      condition = {
        where: {
          identifier: ILike(`%${query.toLowerCase().replace(/\s/, '-')}%`),
        },
      };
    }

    const [groups, total] = await this.groupRepository.findAndCount({
      ...condition,
      take,
      skip,
    });

    return {
      groups: TrimmedGroupMapper.fromGroupList(groups),
      meta: MetadataMapper.fromMetadata({
        page,
        totalPage: Math.ceil(total / take),
      }),
    };
  }
}
