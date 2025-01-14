import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { Repository } from 'typeorm';
import { GetNotificationResponseDto } from './dto/response/get-notification-response.dto';
import { ToggleStatusDto } from './dto/toggle-status.dto';
import { ToggleStatusResponseDto } from './dto/response/toggle-status-response.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { Question } from './entities/question.entity';
import { Group } from '../group/entities/group.entity';
import { FilesReference } from './entities/files-reference.entity';
import { TrimmedUserMapper } from '../mapper/trimmed-user.entity';
import { GetCurrentUserResponseDto } from './dto/response/get-current-user-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { hash } from 'bcrypt';
import * as moment from 'moment/moment';
import { FileService } from '../file/file.service';
import { FollowDto } from './dto/follow.dto';
import { FollowResponseDto } from './dto/response/follow-response.dto';
import { TrimmedGroupMapper } from '../mapper/trimmed-group.entity';
import { FollowedGroup } from '../group/entities/followed-group.entity';
import { GetFollowStatusResponseDto } from './dto/response/get-follow-status-response.dto';
import { BlockResponseDto } from './dto/response/block-response.dto';
import { GetBlockStatusResponseDto } from './dto/response/get-block-status-response.dto';
import { GetQuestionsResponseDto } from './dto/response/get-questions-response.dto';
import { BlockedUser } from './entities/blocked-user.entity';
import { TrimmedQuestionMapper } from '../mapper/question.entity';
import { MetadataMapper } from '../mapper/metadata-mapper.entity';
import { GetBlockUsersResponseDto } from './dto/response/get-block-users-response.dto';
import { MarkAsReadNotificationResponseDto } from './dto/response/mark-as-read-notification-response.dto';
import { Events } from '../post-ws/enums/ws-message.enum';
import { NotificationObserverDto } from '../notification-observer/dto/NotificationObserverDto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UserService {
  private readonly elasticsearchIndex: string = 'dbserver1.tugas_akhir.users';
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(FilesReference)
    private fileReferenceRepository: Repository<FilesReference>,
    @InjectRepository(FollowedGroup)
    private followedGroupRepository: Repository<FollowedGroup>,
    @InjectRepository(BlockedUser)
    private blockedUserRepository: Repository<BlockedUser>,
    private readonly fileService: FileService,
    private readonly eventEmmiter: EventEmitter2,
  ) {}

  async getAllNotifications(
    currentUser: User,
    page: number,
  ): Promise<GetNotificationResponseDto> {
    if (!page || page < 1) page = 1;
    const take: number = 5;
    const skip = (page - 1) * take;

    const [notifications, count] =
      await this.notificationRepository.findAndCount({
        where: {
          user: {
            id: currentUser.id,
          },
        },
        order: {
          createdAt: 'DESC',
        },
        skip,
        take,
      });

    return {
      notifications,
      meta: MetadataMapper.fromMetadata({
        page,
        totalPage: Math.ceil(count / take),
      }),
    };
  }

  async markAsRead(
    user: User,
    notificationId: string,
  ): Promise<MarkAsReadNotificationResponseDto> {
    if (notificationId === 'all') {
      await this.notificationRepository.update(
        {
          user: {
            id: user.id,
          },
        },
        {
          read: true,
        },
      );

      const notifications = await this.notificationRepository.find({
        where: {
          user: {
            id: user.id,
          },
        },
      });

      return {
        notifications,
      };
    }

    const notification = await this.notificationRepository.findOne({
      where: {
        id: notificationId,
        user: {
          id: user.id,
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.read = true;
    await this.notificationRepository.save(notification);

    const notifications = await this.notificationRepository.find({
      where: {
        user: {
          id: user.id,
        },
      },
    });

    return {
      notifications,
    };
  }

  async toggleStatus(
    currentUser: User,
    toggleStatusBody: ToggleStatusDto,
  ): Promise<ToggleStatusResponseDto> {
    const user = await this.userRepository.findOne({
      where: {
        id: currentUser.id,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.acceptQuestion = toggleStatusBody.accept;
    const updatedUser = await this.userRepository.save(user);

    return {
      user: TrimmedUserMapper.fromUser(updatedUser),
    };
  }

  async blockUser(
    currentUser: User,
    blockData: BlockUserDto,
  ): Promise<BlockResponseDto> {
    if (!blockData.userId && !blockData.postId) {
      throw new BadRequestException('User ID or Post ID are required');
    }

    if (blockData.userId && blockData.postId) {
      throw new BadRequestException(
        'User ID and Post ID cannot be used together',
      );
    }

    const user = await this.userRepository.findOne({
      where: {
        id: currentUser.id,
      },
      relations: ['blockedUsers'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userToBlock = await this.userRepository.findOne({
      where: [
        {
          id: blockData.userId,
        },
        {
          questions: {
            id: blockData.postId,
          },
        },
      ],
    });

    if (!userToBlock) {
      throw new NotFoundException('User to block not found');
    }

    if (userToBlock.id === currentUser.id) {
      throw new BadRequestException('You cannot block yourself');
    }

    if (blockData.block) {
      const currentBlockedUser = await this.blockedUserRepository.findOne({
        where: {
          userId: currentUser.id,
          blockedUserId: userToBlock.id,
        },
      });

      if (!currentBlockedUser) {
        const blockedUser = new BlockedUser();
        blockedUser.userId = currentUser.id;
        blockedUser.blockedUserId = userToBlock.id;

        await this.blockedUserRepository.save([
          ...user.blockedUsers,
          blockedUser,
        ]);
      }
    } else {
      await this.blockedUserRepository.delete({
        userId: currentUser.id,
        blockedUserId: userToBlock.id,
      });
    }

    const updatedUser = await this.userRepository.findOne({
      where: {
        id: currentUser.id,
      },
      relations: ['blockedUsers'],
    });

    return {
      blockedUsers: updatedUser.blockedUsers.map((blockedUser) => ({
        ...TrimmedUserMapper.fromUser(blockedUser.blockedUser),
      })),
    };
  }

  /*private async checkModeration(askDto: AskDto) {
    /!*const moderationRequest = await this.httpService.axiosRef.post(
      'https://api.edenai.run/v2/text/moderation',
      {
        response_as_dict: true,
        attributes_as_list: false,
        show_original_response: false,
        providers: 'openai',
        text: askDto.content,
        language: 'id',
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization:
            'Bearer ' + this.configService.get<string>('MODERATION_API_KEY'),
        },
      },
    );

    return !(
      moderationRequest.data?.google?.nsfw_likelihood_score > 0.6 ||
      moderationRequest.data?.clarifai?.nsfw_likelihood_score > 0.6 ||
      moderationRequest.data?.microsoft?.nsfw_likelihood_score > 0.6 ||
      moderationRequest.data?.openai?.nsfw_likelihood_score > 0.6
    );*!/
    return BadWord.cek(askDto.content);
  }

  async askQuestion(
    user: User,
    askDto: AskDto,
    files: Array<Express.Multer.File>,
  ): Promise<AskResponseDto> {
    let userToAsk = null,
      groupToAsk = null;
    if (askDto.userId) {
      userToAsk = await this.userRepository.findOne({
        where: {
          id: askDto.userId,
        },
      });
    }
    if (askDto.groupId) {
      groupToAsk = await this.groupRepository.findOne({
        where: {
          id: askDto.groupId,
        },
      });
    }

    if (askDto.userId && askDto.groupId && !userToAsk && !groupToAsk) {
      throw new BadRequestException('User or group not found');
    }

    if (await this.checkModeration(askDto)) {
      throw new BadRequestException('Content is not allowed');
    }

    const ask = new Question();

    const owner = new User();
    owner.id = user.id;
    ask.owner = owner;

    ask.question = askDto.content;
    ask.anonymous = askDto.anonymous === 'true';

    if (userToAsk) {
      ask.targetUser = userToAsk;
    }
    if (groupToAsk) {
      ask.targetGroup = groupToAsk;
    }

    const savedQuestion = await this.questionRepository.save(ask);

    if (files && files.length > 0) {
      const filesReference = files.map(async (file) => {
        const filesReference = new FilesReference();
        filesReference.question = savedQuestion;
        filesReference.fileName = await this.fileService.saveFile(file);

        return filesReference;
      });

      ask.files = await this.fileReferenceRepository.save(
        await Promise.all(filesReference),
      );
    }

    const results = await this.questionRepository.findOne({
      where: {
        id: savedQuestion.id,
      },
      relations: ['owner', 'targetUser', 'targetGroup', 'files', 'replies'],
    });

    return TrimmedQuestionMapper.fromQuestion(results);
    /!*return {
      id: results.id,
      question: results.question,
      anonymous: results.anonymous,
      createdAt: results.createdAt,
      updatedAt: results.updatedAt,
      ...(results.anonymous
        ? {}
        : {
            owner: TrimmedUserMapper.fromUser(results.owner),
          }),
      ...(results.targetUser
        ? {
            targetUser: TrimmedUserMapper.fromUser(results.targetUser),
          }
        : {}),
      ...(results.targetGroup
        ? {
            targetGroup: {
              id: results.targetGroup.id,
              name: results.targetGroup.name,
            },
          }
        : {}),
      files: results.files.map((file) => ({
        id: file.id,
        url: FileMapper.toUrl(file.id),
      })),
    };*!/
  }*/

  async getCurrentUser(
    username: string,
    type: 'username' | 'id',
    user?: User,
  ): Promise<GetCurrentUserResponseDto> {
    const currentUser = await this.userRepository.findOne({
      where:
        type === 'username'
          ? {
              username: username,
            }
          : {
              id: username,
            },
      relations: ['blockedUsers'],
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    if (
      user &&
      currentUser.blockedUsers
        .map((user) => user.blockedUserId)
        .includes(user.id)
    ) {
      throw new BadRequestException('User is blocked');
    }

    const [totalQuestions, followers, upvotes] = await Promise.all([
      this.questionRepository.count({
        where: {
          owner: {
            id: currentUser.id,
          },
        },
      }),
      this.userRepository.count({
        where: {
          followUser: {
            id: currentUser.id,
          },
        },
        relations: ['followUser'],
      }),
      /*this.userRepository.count({
        where: [
          {
            upvotedReplies: {
              upvoters: {
                id: currentUser.id,
              },
            },
          },
          {
            upvotedQuestions: {
              upvoters: {
                id: currentUser.id,
              },
            },
          },
        ],
        relations: ['upvotedQuestions', 'upvotedReplies'],
      }),*/
      this.questionRepository.sum('vote', {
        owner: {
          id: currentUser.id,
        },
      }),
    ]);

    return {
      user: {
        ...TrimmedUserMapper.fromUser(currentUser),
        totalQuestions,
        totalFollowers: followers,
        totalUpVotes: upvotes,
      },
    };
  }

  async updateCurrentUser(
    user: User,
    updatedUser: UpdateProfileDto,
    profilePicture: Express.Multer.File,
  ): Promise<GetCurrentUserResponseDto> {
    const currentUser = await this.userRepository.findOne({
      where: {
        id: user.id,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    const userUpdateObj = new User();

    userUpdateObj.name = updatedUser.name;

    if (updatedUser?.password)
      userUpdateObj.password = await hash(updatedUser.password, 10);

    if (updatedUser?.birthday)
      userUpdateObj.birthday = moment(
        updatedUser.birthday,
        'DD-MM-YYYY',
      ).toDate();

    if (profilePicture) {
      const oldUserProfile = await this.userRepository.findOne({
        where: {
          id: user.id,
        },
      });
      try {
        await this.fileService.deleteFile(
          oldUserProfile.profilePicture.split('/').pop(),
        );
      } catch (e) {
        // Do nothing
      }

      userUpdateObj.profilePicture =
        await this.fileService.saveFile(profilePicture);
    }

    if (updatedUser?.username) {
      const userWithUsername = await this.userRepository.findOne({
        where: {
          username: updatedUser.username,
        },
      });
      if (userWithUsername) {
        throw new BadRequestException('Username already exists');
      }
      userUpdateObj.username = updatedUser.username;
    }

    const updatedUserObj = await this.userRepository.save({
      ...currentUser,
      ...userUpdateObj,
    });

    return this.getCurrentUser(updatedUserObj.id, 'id');
  }

  async followUser(
    user: User,
    followUserDto: FollowDto,
  ): Promise<FollowResponseDto> {
    if (!followUserDto.userId && !followUserDto.groupId) {
      throw new BadRequestException('User ID or Group ID are required');
    }
    if (followUserDto.userId && followUserDto.groupId) {
      throw new BadRequestException(
        'User ID and Group ID cannot be used together',
      );
    }

    const currentUser = await this.userRepository.findOne({
      where: {
        id: user.id,
      },
      relations: ['followUser', 'followGroup.group'],
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    if (followUserDto.userId) {
      const userToFollow = await this.userRepository.findOne({
        where: {
          id: followUserDto.userId,
        },
      });

      if (!userToFollow) {
        throw new NotFoundException('User not found');
      }

      try {
        if (followUserDto.follow) {
          await this.userRepository
            .createQueryBuilder()
            .relation(User, 'followUser')
            .of(currentUser)
            .add(userToFollow);

          this.eventEmmiter.emit(
            Events.NOTIFICATION_CREATED,
            NotificationObserverDto.forNewFollower({
              room: [userToFollow.id],
              followerUsername: user.username,
            }),
          );
        } else {
          await this.userRepository
            .createQueryBuilder()
            .relation(User, 'followUser')
            .of(currentUser)
            .remove(userToFollow);
        }
      } catch (e) {
        console.log('error in update');
        console.error(e);
      }
    }
    if (followUserDto.groupId) {
      const groupToFollow = await this.groupRepository.findOne({
        where: {
          id: followUserDto.groupId,
        },
      });

      if (!groupToFollow) {
        throw new NotFoundException('Group not found');
      }
      if (followUserDto.follow) {
        const currentFollowedGroup = await this.followedGroupRepository.findOne(
          {
            where: {
              groupId: groupToFollow.id,
              userId: currentUser.id,
            },
          },
        );

        if (!currentFollowedGroup) {
          const followedGroup = new FollowedGroup();
          followedGroup.userId = currentUser.id;
          followedGroup.groupId = groupToFollow.id;

          await this.followedGroupRepository.save([
            ...currentUser.followGroup,
            followedGroup,
          ]);
        }
      } else {
        await this.followedGroupRepository.delete({
          groupId: groupToFollow.id,
          userId: currentUser.id,
        });
      }
    }

    return await this.getFollowing(user.id);
  }

  async getFollowing(userId: string): Promise<FollowResponseDto> {
    const userWithFollowing = await this.userRepository.findOne({
      where: {
        id: userId,
      },
      relations: ['followUser', 'followGroup.group'],
    });
    return {
      userFollowing: TrimmedUserMapper.fromUserList(
        userWithFollowing.followUser,
      ),
      groupFollowing: userWithFollowing.followGroup.map((group) =>
        TrimmedGroupMapper.fromGroup(group.group),
      ),
    };
  }

  async getFollowStatus(
    user: User,
    userId: string,
  ): Promise<GetFollowStatusResponseDto> {
    const [following, followedBack] = await Promise.all([
      this.userRepository.findOne({
        where: {
          id: user.id,
          followUser: {
            id: userId,
          },
        },
        relations: ['followUser'],
      }),
      this.userRepository.findOne({
        where: {
          id: userId,
          followUser: {
            id: user.id,
          },
        },
        relations: ['followUser'],
      }),
    ]);
    return {
      following: !!following,
      followedBack: !!followedBack,
    };
  }

  async getBlockStatus(
    user: User,
    userId: string,
  ): Promise<GetBlockStatusResponseDto> {
    const blocked = await this.userRepository.findOne({
      where: {
        id: user.id,
        blockedUsers: {
          blockedUserId: userId,
        },
      },
      relations: ['blockedUsers'],
    });

    return {
      blocked: !!blocked,
    };
  }

  async getQuestions(
    user: User,
    userId: string,
    page: number,
  ): Promise<GetQuestionsResponseDto> {
    if (!page || page < 1) page = 1;
    const take: number = 5;
    const skip = (page - 1) * take;

    let hideAnonymousPost = false;
    if (userId !== user.id) {
      hideAnonymousPost = true;
    }

    const [totalQuestions, questions] = await Promise.all([
      this.questionRepository.count({
        where: {
          ...(hideAnonymousPost ? { anonymous: false } : {}),
          owner: {
            id: userId,
          },
        },
      }),
      this.questionRepository.find({
        where: {
          ...(hideAnonymousPost ? { anonymous: false } : {}),
          owner: {
            id: userId,
          },
        },
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
      }),
    ]);

    const totalPage = Math.ceil(totalQuestions / take);

    return {
      questions: TrimmedQuestionMapper.fromQuestionList(questions, user),
      meta: MetadataMapper.fromMetadata({
        page,
        totalPage,
      }),
    };
  }

  async getBlockedUsers(
    user: User,
    page: number,
  ): Promise<GetBlockUsersResponseDto> {
    if (!page || page < 1) page = 1;
    const take: number = 5;
    const skip = (page - 1) * take;

    const [blockedUsers, totalBlockedUsers] = await this.blockedUserRepository
      .createQueryBuilder('blockedUser')
      .leftJoinAndSelect('blockedUser.blockedUser', 'blockedUserDetails')
      .where('blockedUser.userId = :userId', { userId: user.id })
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return {
      blockedUsers: blockedUsers.map((blockedUser) => ({
        ...TrimmedUserMapper.fromUser(blockedUser.blockedUser),
      })),
      meta: MetadataMapper.fromMetadata({
        page,
        totalPage: Math.ceil(totalBlockedUsers / take),
      }),
    };
  }

  async getAllQuestions(user: User, page: number) {
    if (!page || page < 1) page = 1;
    const take: number = 10;
    const skip = (page - 1) * take;

    const [totalQuestions, questions] = await Promise.all([
      this.questionRepository.count(),
      this.questionRepository.find({
        relations: [
          'owner',
          'files',
          'replies',
          'replies.owner',
          'upvoters',
          'replies.upvoters',
        ],
        order: {
          vote: 'DESC',
          createdAt: 'DESC',
        },
        take,
        skip,
      }),
    ]);

    const totalPage = Math.ceil(totalQuestions / take);

    return {
      questions: TrimmedQuestionMapper.fromQuestionList(questions, user),
      meta: MetadataMapper.fromMetadata({
        page,
        totalPage,
      }),
    };
  }
}
