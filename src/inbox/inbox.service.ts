import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../user/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Question } from '../user/entities/question.entity';
import { FindOptionsWhere, Repository } from 'typeorm';
import { TrimmedQuestionMapper } from '../mapper/question.entity';
import { MetadataMapper } from '../mapper/metadata-mapper.entity';
import { GetInboxResponseDto } from './dto/response/get-inbox-response.dto';
import { GetSingleInboxResponseDto } from './dto/response/get-single-inbox-response.dto';

@Injectable()
export class InboxService {
  constructor(
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
  ) {}

  async findAll(
    filter: string,
    page: number,
    size: number,
    user: User,
  ): Promise<GetInboxResponseDto> {
    if (!page || page < 1) page = 1;
    const take: number = size || 10;
    const skip = (page - 1) * take;

    let queryFilter: FindOptionsWhere<Question> | FindOptionsWhere<Question>[] =
      [
        { targetUser: { id: user.id } },
        { targetGroup: { userGroups: { userId: user.id } } },
        { targetGroup: { followers: { userId: user.id } } },
      ];

    if (filter === 'all') {
      queryFilter = [
        { targetUser: { id: user.id } },
        { targetGroup: { userGroups: { userId: user.id } } },
        { targetGroup: { followers: { userId: user.id } } },
      ];
    } else if (filter === 'me') {
      queryFilter = [{ targetUser: { id: user.id } }];
    } else if (filter === 'group') {
      queryFilter = [
        { targetGroup: { userGroups: { userId: user.id } } },
        { targetGroup: { followers: { userId: user.id } } },
      ];
    }

    const [questions, total] = await this.questionRepository.findAndCount({
      where: queryFilter,
      relations: [
        'owner',
        'files',
        'replies',
        'replies.owner',
        'upvoters',
        'replies.upvoters',
      ],
      order: {
        createdAt: 'DESC',
      },
      take,
      skip,
    });

    const totalPage = Math.ceil(total / take);

    return {
      questions: TrimmedQuestionMapper.fromQuestionList(questions, user),
      meta: MetadataMapper.fromMetadata({
        page,
        totalPage,
      }),
    };
  }

  async findOne(id: string, user: User): Promise<GetSingleInboxResponseDto> {
    const question = await this.questionRepository.findOne({
      where: {
        id: id,
      },
      relations: [
        'owner',
        'files',
        'replies',
        'replies.owner',
        'upvoters',
        'replies.upvoters',
      ],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return {
      question: TrimmedQuestionMapper.fromQuestion(question, user),
    };
  }
}
