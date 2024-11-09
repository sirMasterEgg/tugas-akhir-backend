import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { User } from './entities/user.entity';
import { Group } from '../group/entities/group.entity';
import { Repository } from 'typeorm';
import { FileService } from '../file/file.service';
import { Question } from './entities/question.entity';
import { FilesReference } from './entities/files-reference.entity';
import { FollowedGroup } from '../group/entities/followed-group.entity';
import { BlockedUser } from './entities/blocked-user.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ToggleStatusDto } from './dto/toggle-status.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FollowDto } from './dto/follow.dto';
import { Events } from '../post-ws/enums/ws-message.enum';
import { TrimmedUserMapper } from '../mapper/trimmed-user.entity';
import { TrimmedGroupMapper } from '../mapper/trimmed-group.entity';
import { FollowResponseDto } from './dto/response/follow-response.dto';
import { GetFollowStatusResponseDto } from './dto/response/get-follow-status-response.dto';
import { GetBlockStatusResponseDto } from './dto/response/get-block-status-response.dto';

describe('UserService', () => {
  let service: UserService;
  let notificationRepository: Repository<Notification>;
  let userRepository: Repository<User>;
  let groupRepository: Repository<Group>;
  let questionRepository: Repository<Question>;
  let filesReferenceRepository: Repository<FilesReference>;
  let followedGroupRepository: Repository<FollowedGroup>;
  let blockedUserRepository: Repository<BlockedUser>;
  let fileService: FileService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(Notification),
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
          provide: getRepositoryToken(Question),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(FilesReference),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(FollowedGroup),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(BlockedUser),
          useClass: Repository,
        },
        {
          provide: FileService,
          useValue: {
            saveFile: jest.fn(),
            deleteFile: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    notificationRepository = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    groupRepository = module.get<Repository<Group>>(getRepositoryToken(Group));
    questionRepository = module.get<Repository<Question>>(
      getRepositoryToken(Question),
    );
    filesReferenceRepository = module.get<Repository<FilesReference>>(
      getRepositoryToken(FilesReference),
    );
    followedGroupRepository = module.get<Repository<FollowedGroup>>(
      getRepositoryToken(FollowedGroup),
    );
    blockedUserRepository = module.get<Repository<BlockedUser>>(
      getRepositoryToken(BlockedUser),
    );
    fileService = module.get<FileService>(FileService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllNotifications', () => {
    const currentUser = { id: 'user1' }; // Mock current user
    const notifications = [
      { id: '1', user: { id: 'user1' }, read: false, createdAt: new Date() },
      { id: '2', user: { id: 'user1' }, read: false, createdAt: new Date() },
    ];
    const count = notifications.length;

    it('should return notifications with pagination metadata', async () => {
      const page = 1;

      notificationRepository.findAndCount = jest
        .fn()
        .mockResolvedValue([notifications, count]);

      const result = await service.getAllNotifications(
        currentUser as User,
        page,
      );

      expect(result.notifications).toBe(notifications);
      expect(result.meta.currentPage).toBe(page);
      expect(result.meta.totalPage).toBe(1); // 5 notifications per page, count is 2
    });

    it('should default to page 1 when page is less than 1', async () => {
      const page = 0; // Edge case

      notificationRepository.findAndCount = jest
        .fn()
        .mockResolvedValue([notifications, count]);

      const result = await service.getAllNotifications(
        currentUser as User,
        page,
      );

      expect(result.notifications).toBe(notifications);
      expect(result.meta.currentPage).toBe(1); // Defaulting to 1
    });
  });

  describe('markAsRead', () => {
    const currentUser = { id: 'user1' }; // Mock current user
    const notifications = [
      { id: '1', user: { id: 'user1' }, read: false, createdAt: new Date() },
      { id: '2', user: { id: 'user1' }, read: false, createdAt: new Date() },
    ];

    it('should mark all notifications as read', async () => {
      const notificationId = 'all'; // Mark all notifications
      const notificationExpected = notifications.map((n) => ({
        ...n,
        read: true,
      }));

      notificationRepository.update = jest
        .fn()
        .mockResolvedValue(notificationExpected);
      notificationRepository.find = jest
        .fn()
        .mockResolvedValue(notificationExpected);

      const result = await service.markAsRead(
        currentUser as User,
        notificationId,
      );

      expect(notificationRepository.update).toHaveBeenCalledWith(
        { user: { id: currentUser.id } },
        { read: true },
      );
      expect(result.notifications).toBe(notificationExpected);
    });

    it('should mark a single notification as read', async () => {
      const notificationId = '1'; // Mark single notification as read
      notificationRepository.findOne = jest
        .fn()
        .mockResolvedValue(notifications[0]);
      notificationRepository.find = jest.fn().mockResolvedValue(notifications);
      notificationRepository.save = jest.fn().mockResolvedValue({
        ...notifications[0],
        id: '1',
        read: true,
      });

      const result = await service.markAsRead(
        currentUser as User,
        notificationId,
      );

      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: notificationId, user: { id: currentUser.id } },
      });
      expect(notificationRepository.save).toHaveBeenCalledWith({
        ...notifications[0],
        id: '1',
        read: true,
      });
      expect(result.notifications).toBe(notifications);
    });

    it('should throw NotFoundException if notification not found', async () => {
      const notificationId = 'non-existent-id'; // Non-existent notification
      notificationRepository.findOne = jest.fn().mockResolvedValue(null); // No notification found

      await expect(
        service.markAsRead(currentUser as User, notificationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleStatus', () => {
    const currentUser = { id: 'user1' }; // Mock current user
    const existingUser = { id: 'user1', acceptQuestion: false };

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.toggleStatus(
          currentUser as User,
          { accept: true } as ToggleStatusDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully toggle status and return updated user', async () => {
      userRepository.findOne = jest.fn().mockResolvedValue(existingUser);
      userRepository.save = jest
        .fn()
        .mockResolvedValue({ ...existingUser, acceptQuestion: true });

      const result = await service.toggleStatus(currentUser as User, {
        accept: true,
      });

      expect(userRepository.save).toHaveBeenCalledWith({
        ...existingUser,
        acceptQuestion: true,
      });
      expect(result.user.acceptQuestion).toBe(true);
    });
  });

  describe('blockUser', () => {
    const currentUser = { id: 'user1' }; // Mock current user
    const existingUser = { id: 'user1', acceptQuestion: false };
    const userToBlock = { id: 'user2' };
    it('should throw BadRequestException if neither userId nor postId is provided', async () => {
      const blockData: BlockUserDto = {
        userId: null,
        postId: null,
      } as BlockUserDto;
      await expect(
        service.blockUser(currentUser as User, blockData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if both userId and postId are provided', async () => {
      const blockData: BlockUserDto = {
        userId: 'user2',
        postId: 'post1',
      } as BlockUserDto;
      await expect(
        service.blockUser(currentUser as User, blockData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user to block not found', async () => {
      const blockData: BlockUserDto = {
        userId: 'user2',
        postId: null,
      } as BlockUserDto;
      userRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.blockUser(currentUser as User, blockData),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if trying to block yourself', async () => {
      const blockData: BlockUserDto = {
        userId: 'user1',
        postId: null,
      } as BlockUserDto;
      userRepository.findOne = jest.fn().mockResolvedValue(existingUser);

      await expect(
        service.blockUser(currentUser as User, blockData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block a user if block is true and save to blockedUsers', async () => {
      const blockData: BlockUserDto = {
        userId: 'user2',
        postId: null,
        block: true,
      };
      const user = { id: 'user1', blockedUsers: [] };
      userRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(userToBlock)
        .mockReturnValueOnce({
          ...user,
          blockedUsers: [{ blockedUser: userToBlock }],
        });
      blockedUserRepository.findOne = jest.fn().mockResolvedValue(null);
      blockedUserRepository.save = jest.fn().mockResolvedValue(undefined);

      const result = await service.blockUser(currentUser as User, blockData);

      expect(blockedUserRepository.save).toHaveBeenCalled();
      expect(result.blockedUsers.length).toBeGreaterThan(0);
    });

    it('should unblock a user if block is false', async () => {
      const blockData: BlockUserDto = {
        userId: 'user2',
        postId: null,
        block: false,
      };
      const user = {
        id: 'user1',
        blockedUsers: [{ blockedUser: userToBlock }],
      };

      userRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(userToBlock)
        .mockReturnValueOnce({
          ...user,
          blockedUsers: [],
        });
      blockedUserRepository.findOne = jest.fn().mockResolvedValue(userToBlock);
      blockedUserRepository.delete = jest.fn().mockResolvedValue(undefined);

      const result = await service.blockUser(currentUser as User, blockData);

      expect(blockedUserRepository.delete).toHaveBeenCalled();
      expect(result.blockedUsers.length).toBe(0);
    });
  });

  describe('getCurrentUser', () => {
    const user = { id: 'user1', username: 'testuser', blockedUsers: [] };

    it('should throw NotFoundException if user is not found by username', async () => {
      userRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.getCurrentUser('nonexistentuser', 'username'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user is not found by id', async () => {
      userRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.getCurrentUser('user1', 'id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if the user is blocked by the current user', async () => {
      const blockedUser = { id: 'user2' } as User;
      userRepository.findOne = jest.fn().mockResolvedValue({
        ...user,
        blockedUsers: [{ blockedUserId: 'user2' }],
      });

      await expect(
        service.getCurrentUser('user1', 'username', blockedUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return the current user data along with additional statistics', async () => {
      const currentUserData = {
        ...user,
        blockedUsers: [],
      };
      userRepository.findOne = jest.fn().mockResolvedValue(currentUserData);
      userRepository.count = jest.fn().mockResolvedValue(10);
      questionRepository.count = jest.fn().mockResolvedValue(10);
      questionRepository.sum = jest.fn().mockResolvedValue(5);

      const result = await service.getCurrentUser('user1', 'id');

      expect(result.user.username).toBe('testuser');
      expect(result.user.totalQuestions).toBe(10);
      expect(result.user.totalFollowers).toBe(10);
      expect(result.user.totalUpVotes).toBe(5);
    });
  });

  describe('updateCurrentUser', () => {
    const user = {
      id: 'user1',
      username: 'testuser',
      blockedUsers: [],
      profilePicture: 'old/image.jpg',
    };
    const updatedUserDto = {
      name: 'Updated Name',
      username: 'newusername',
    } as UpdateProfileDto;

    it('should throw NotFoundException if the user is not found', async () => {
      userRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.updateCurrentUser(user as User, updatedUserDto, null),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if the username already exists', async () => {
      userRepository.findOne = jest.fn().mockResolvedValue(user);
      userRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce({ username: 'newusername' });
      userRepository.findOne = jest
        .fn()
        .mockResolvedValue({ username: 'newusername' });
      userRepository.save = jest
        .fn()
        .mockResolvedValue({ ...user, username: 'newusername' });

      await expect(
        service.updateCurrentUser(user as User, updatedUserDto, null),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully update the user profile without profile picture', async () => {
      const updatedUser = { ...user, ...updatedUserDto };
      userRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(null);
      userRepository.save = jest.fn().mockResolvedValue(updatedUser);
      service.getCurrentUser = jest
        .fn()
        .mockResolvedValue({ user: updatedUser });

      const result = await service.updateCurrentUser(
        user as User,
        updatedUserDto,
        null,
      );

      expect(result.user.username).toBe(updatedUserDto.username);
      expect(result.user.name).toBe(updatedUserDto.name);
    });

    it('should successfully update the user profile with profile picture', async () => {
      const updatedUser = {
        ...user,
        ...updatedUserDto,
        profilePicture: 'path/to/file',
      };
      const mockFile = { path: 'file-path' } as Express.Multer.File;

      userRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(null);
      fileService.saveFile = jest.fn().mockResolvedValue('path/to/file');
      userRepository.save = jest.fn().mockResolvedValue(updatedUser);
      service.getCurrentUser = jest
        .fn()
        .mockResolvedValue({ user: updatedUser });

      const result = await service.updateCurrentUser(
        user as User,
        updatedUserDto,
        mockFile,
      );

      expect(result.user.username).toBe(updatedUserDto.username);
      expect(fileService.saveFile).toHaveBeenCalledWith(mockFile);
    });
  });

  describe('followUser', () => {
    const user = {
      id: 'user1',
      username: 'testuser',
      followUser: [],
      followGroup: [],
    } as User;
    const userToFollow = { id: 'user2', username: 'user2' };

    it('should throw BadRequestException if neither userId nor groupId is provided', async () => {
      const followDto = {
        userId: null,
        groupId: null,
        follow: true,
      } as FollowDto;
      await expect(service.followUser(user, followDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if both userId and groupId are provided', async () => {
      const followDto: FollowDto = {
        userId: 'user1',
        groupId: 'group1',
        follow: true,
      } as FollowDto;
      await expect(service.followUser(user, followDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if current user is not found', async () => {
      const followDto = { userId: 'user2', follow: true } as FollowDto;
      userRepository.findOne = jest.fn().mockResolvedValue(null);
      await expect(service.followUser(user, followDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if user to follow is not found', async () => {
      const followDto = { userId: 'user2', follow: true } as FollowDto;
      userRepository.findOne = jest.fn().mockResolvedValue(user);
      userRepository.findOne = jest.fn().mockResolvedValueOnce(null); // user to follow not found
      await expect(service.followUser(user, followDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should successfully follow a user and emit event', async () => {
      const followDto = { userId: 'user2', follow: true };
      userRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(userToFollow);
      userRepository.save = jest.fn().mockResolvedValue(user);
      service.getFollowing = jest.fn().mockResolvedValue({
        userFollowing: userToFollow,
        groupFollowing: [],
      });

      const result = await service.followUser(user, followDto);

      expect(result).toEqual({
        userFollowing: expect.anything(),
        groupFollowing: [],
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        Events.NOTIFICATION_CREATED,
        expect.anything(),
      );
    });
  });

  describe('getFollowing', () => {
    const user = {
      id: 'user1',
      username: 'testuser',
      followUser: [
        { id: 'user2', username: 'user2' }, // mock followed user
      ],
      followGroup: [
        { group: { id: 'group1', name: 'group1' } }, // mock followed group
      ],
    } as User;

    it('should return empty followUser and followGroup when the user has no followers', async () => {
      const userId = 'user1';
      const userWithNoFollowers = {
        ...user,
        followUser: [],
        followGroup: [],
      };
      userRepository.findOne = jest.fn().mockResolvedValue(userWithNoFollowers); // User with no followers

      const result = await service.getFollowing(userId);

      expect(result.userFollowing).toEqual([]); // No followed users
      expect(result.groupFollowing).toEqual([]); // No followed groups
    });

    it('should return userFollowing and groupFollowing when the user has followers', async () => {
      const userId = 'user1';
      userRepository.findOne = jest.fn().mockResolvedValue(user); // User with followers

      // Mocks for the mappers
      const trimmedUser = { id: 'user2', username: 'user2' };
      const trimmedGroup = { id: 'group1', name: 'group1' };
      jest
        .spyOn(TrimmedUserMapper, 'fromUserList')
        .mockReturnValue([trimmedUser] as any);
      jest
        .spyOn(TrimmedGroupMapper, 'fromGroup')
        .mockReturnValue(trimmedGroup as any);

      const result: FollowResponseDto = await service.getFollowing(userId);

      expect(result.userFollowing).toEqual([trimmedUser]); // Mapped followed user
      expect(result.groupFollowing).toEqual([trimmedGroup]); // Mapped followed group
    });
  });

  describe('getFollowStatus', () => {
    const user = {
      id: 'user1',
      username: 'testuser',
      followUser: [
        { id: 'user2', username: 'user2' }, // mock followed user
      ],
      blockedUsers: [
        { blockedUserId: 'user3' }, // mock blocked user
      ],
    } as User;

    it('should return following: true when user is following the target user', async () => {
      const userId = 'user1';
      const targetUserId = 'user2';

      // Mock the findOne to simulate the current user is following the target user
      userRepository.findOne = jest.fn().mockResolvedValueOnce(user); // Simulating the relationship

      const result: GetFollowStatusResponseDto = await service.getFollowStatus(
        user,
        targetUserId,
      );

      expect(result.following).toBe(true);
      expect(result.followedBack).toBe(false); // Assuming target user is not following back
    });

    it('should return followedBack: true when the target user is following back', async () => {
      const userId = 'user1';
      const targetUserId = 'user2';

      // Mock the findOne to simulate both users following each other
      userRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({
          id: 'user2',
          username: 'user2',
          followUser: [
            { id: 'user1', username: 'user1' }, // mock followed user
          ],
          blockedUsers: [
            { blockedUserId: 'user3' }, // mock blocked user
          ],
        });

      const result: GetFollowStatusResponseDto = await service.getFollowStatus(
        user,
        targetUserId,
      );

      expect(result.following).toBe(true); // The current user follows the target
      expect(result.followedBack).toBe(true); // The target follows back
    });

    it('should return following: false and followedBack: false when there is no following', async () => {
      const userId = 'user1';
      const targetUserId = 'user4'; // Target user that is neither followed nor following back

      userRepository.findOne = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result: GetFollowStatusResponseDto = await service.getFollowStatus(
        user,
        targetUserId,
      );

      expect(result.following).toBe(false);
      expect(result.followedBack).toBe(false);
    });
  });

  describe('getBlockStatus', () => {
    const user = {
      id: 'user1',
      username: 'testuser',
      followUser: [
        { id: 'user2', username: 'user2' }, // mock followed user
      ],
      blockedUsers: [
        { blockedUserId: 'user3' }, // mock blocked user
      ],
    } as User;

    it('should return blocked: true if the user has blocked the target user', async () => {
      const userId = 'user1';
      const targetUserId = 'user3';

      // Simulating blocked user
      userRepository.findOne = jest.fn().mockResolvedValueOnce(user); // Simulating blocked user

      const result: GetBlockStatusResponseDto = await service.getBlockStatus(
        user,
        targetUserId,
      );

      expect(result.blocked).toBe(true);
    });

    it('should return blocked: false if the user has not blocked the target user', async () => {
      const userId = 'user1';
      const targetUserId = 'user2'; // User2 is not blocked

      userRepository.findOne = jest.fn().mockResolvedValueOnce(null); // Simulating no blocked user

      const result: GetBlockStatusResponseDto = await service.getBlockStatus(
        user,
        targetUserId,
      );

      expect(result.blocked).toBe(false);
    });
  });

  describe('getQuestions', () => {
    const owner = { id: 'user2' } as User;
    const question = {
      id: 'question1',
      anonymous: false,
      owner,
      question: 'mock',
      upvoters: [],
      files: [],
      replies: [],
    } as Question;

    it('should return non-anonymous questions if the requested user is different', async () => {
      const user = { id: 'user1' } as User;
      const userId = 'user2';
      const page = 1;

      jest.spyOn(questionRepository, 'count').mockResolvedValue(10);
      jest.spyOn(questionRepository, 'find').mockResolvedValue([question]);

      const result = await service.getQuestions(user, userId, page);

      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].id).toBe('question1');
      expect(result.meta.currentPage).toBe(1);
    });

    it('should include anonymous questions if requested user is the same', async () => {
      const user = { id: 'user1' } as User;
      const page = 1;

      jest.spyOn(questionRepository, 'count').mockResolvedValue(10);
      jest
        .spyOn(questionRepository, 'find')
        .mockResolvedValue([{ ...question, id: 'question2' }]);

      const result = await service.getQuestions(user, user.id, page);

      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].id).toBe('question2');
      expect(result.meta.currentPage).toBe(1);
    });

    it('should default to page 1 if page is invalid', async () => {
      const user = { id: 'user1' } as User;

      jest.spyOn(questionRepository, 'count').mockResolvedValue(10);
      jest.spyOn(questionRepository, 'find').mockResolvedValue([question]);

      const result = await service.getQuestions(user, 'user2', -1);

      expect(result.meta.currentPage).toBe(1);
    });
  });

  describe('getBlockedUsers', () => {
    it('should return paginated list of blocked users', async () => {
      const user = { id: 'user1' } as User;
      const page = 1;

      jest.spyOn(blockedUserRepository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([
            [{ blockedUser: { id: 'user2', username: 'blockedUser' } }],
            5,
          ]),
      } as any);

      const result = await service.getBlockedUsers(user, page);

      expect(result.blockedUsers).toHaveLength(1);
      expect(result.blockedUsers[0].username).toBe('blockedUser');
      expect(result.meta.currentPage).toBe(1);
    });

    it('should default to page 1 if page is invalid', async () => {
      const user = { id: 'user1' } as User;

      jest.spyOn(blockedUserRepository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      } as any);

      const result = await service.getBlockedUsers(user, -1);

      expect(result.meta.currentPage).toBe(1);
    });
  });

  describe('getAllQuestions', () => {
    const owner = { id: 'user2' } as User;

    it('should return a paginated list of questions sorted by vote and createdAt', async () => {
      const user = { id: 'user1' } as User;
      const page = 1;

      jest.spyOn(questionRepository, 'count').mockResolvedValue(20);
      jest.spyOn(questionRepository, 'find').mockResolvedValue([
        {
          id: 'question1',
          vote: 5,
          createdAt: new Date(),
          owner,
          question: 'mock',
          upvoters: [],
          files: [],
          replies: [],
        } as Question,
      ]);

      const result = await service.getAllQuestions(user, page);

      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].id).toBe('question1');
      expect(result.meta.currentPage).toBe(1);
    });

    it('should default to page 1 if page is invalid', async () => {
      const user = { id: 'user1' } as User;

      jest.spyOn(questionRepository, 'count').mockResolvedValue(20);
      jest.spyOn(questionRepository, 'find').mockResolvedValue([
        {
          id: 'question2',
          vote: 3,
          createdAt: new Date(),
          owner,
          question: 'mock',
          upvoters: [],
          files: [],
          replies: [],
        } as Question,
      ]);

      const result = await service.getAllQuestions(user, -1);

      expect(result.meta.currentPage).toBe(1);
    });
  });
});
