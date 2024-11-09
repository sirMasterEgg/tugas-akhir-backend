import { Test, TestingModule } from '@nestjs/testing';
import { GroupService } from './group.service';
import { EntityManager, In, QueryRunner, Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { UserGroup } from './entities/user-group.entity';
import { User } from '../user/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TrimmedUserMapper } from '../mapper/trimmed-user.entity';
import { FollowGroupDto } from './dto/follow-group.dto';
import { FollowedGroup } from './entities/followed-group.entity';

describe('GroupService', () => {
  let service: GroupService;
  let groupRepository: Repository<Group>;
  let userRepository: Repository<User>;
  let userGroupRepository: Repository<UserGroup>;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupService,
        {
          provide: getRepositoryToken(Group),
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
            manager: {
              connection: {
                createQueryRunner: jest.fn(),
              },
            },
          },
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(UserGroup),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<GroupService>(GroupService);
    service = module.get<GroupService>(GroupService);
    groupRepository = module.get<Repository<Group>>(getRepositoryToken(Group));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    userGroupRepository = module.get<Repository<UserGroup>>(
      getRepositoryToken(UserGroup),
    );

    jest
      .spyOn(groupRepository.manager.connection, 'createQueryRunner')
      .mockReturnValue({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          save: jest.fn(),
          delete: jest.fn(),
          find: jest.fn(),
          findOne: jest.fn(),
          update: jest.fn(),
          transaction: jest.fn((cb) => {
            cb({
              queryRunner: {
                manager: {
                  findOne: jest.fn(),
                  save: jest.fn(),
                  delete: jest.fn(),
                },
              },
            });
          }),
        },
      } as unknown as QueryRunner);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create group', () => {
    it('should create a group successfully', async () => {
      const currentUser = { id: 'userId' } as User;
      const createGroupDto: CreateGroupDto = {
        groupName: 'Test Group',
        memberId: ['memberId1', 'memberId2'],
      };
      const group = new Group();
      group.id = 'group1';
      group.name = 'Test Group';
      group.identifier = 'test-group-1234';
      group.owner = currentUser;

      jest
        .spyOn(service, 'setGroupIdentifier')
        .mockReturnValue('test-group-1234');

      jest.spyOn(groupRepository, 'save').mockResolvedValue(group);

      const members = createGroupDto.memberId.map((userId) => {
        const userGroup = new UserGroup();
        userGroup.userId = userId;
        userGroup.groupId = group.id;
        userGroup.joinedAt = new Date();
        return userGroup;
      });

      jest.spyOn(userGroupRepository, 'save').mockResolvedValue(members as any);

      const results = {
        ...group,
        userGroups: members.map((userGroup) => ({
          user: { id: userGroup.userId },
          joinedAt: userGroup.joinedAt,
        })),
      };

      groupRepository.findOne = jest.fn().mockResolvedValue(results);

      const result = await service.create(currentUser, createGroupDto);

      expect(result).toEqual({
        id: 'group1',
        name: 'Test Group',
        identifier: 'test-group-1234',
        owner: TrimmedUserMapper.fromUser(currentUser),
        members: expect.any(Array),
      });
      expect(groupRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ owner: currentUser }),
      );
      expect(groupRepository.save).toHaveBeenCalled();
      expect(userGroupRepository.save).toHaveBeenCalled();
    });
  });

  describe('get all group', () => {
    it('should retrieve all groups for the current user', async () => {
      const currentUser = { id: 'userId' } as User;
      const group1 = {
        id: 'group1',
        name: 'Group One',
        identifier: 'group-one-1234',
        owner: currentUser,
        userGroups: [{ user: { id: 'userId1' } }, { user: { id: 'userId2' } }],
      } as Group;
      const group2 = {
        id: 'group2',
        name: 'Group Two',
        identifier: 'group-two-5678',
        owner: currentUser,
        userGroups: [{ user: { id: 'userId3' } }, { user: { id: 'userId4' } }],
      } as Group;

      jest.spyOn(groupRepository, 'find').mockResolvedValue([group1, group2]);

      const result = await service.findAll(currentUser);

      expect(result.groups).toBeDefined();
      expect(groupRepository.find).toHaveBeenCalled();
      expect(result.groups).toHaveLength(2);
      expect(result.groups[0].id).toBe(group1.id);
      expect(result.groups[1].id).toBe(group2.id);
      expect(groupRepository.find).toHaveBeenCalledTimes(2);
      expect(groupRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userGroups: { userId: currentUser.id } },
        }),
      );
    });
  });

  describe('update group', () => {
    it('should update group successfully', async () => {
      const updateGroupDto = {
        groupName: 'Updated Group',
        memberId: ['member3', 'member4'],
      } as UpdateGroupDto;
      const group = {
        id: 'groupId',
        owner: { id: 'userId' },
        userGroups: [
          {
            user: {
              id: 'memberId1',
            },
          },
          {
            user: {
              id: 'memberId2',
            },
          },
        ],
      } as Group;

      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(group);
      jest.spyOn(groupRepository, 'save').mockResolvedValue(group);

      const result = await service.update('groupId', updateGroupDto, {
        id: 'userId',
      } as User);

      expect(result.name).toBe('Updated Group');
      expect(groupRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if group is not found', async () => {
      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(undefined);

      await expect(
        service.update(
          'groupId',
          {} as UpdateGroupDto,
          { id: 'userId' } as User,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      const group = { id: 'groupId', owner: { id: 'otherUserId' } } as Group;
      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(group);

      await expect(
        service.update(
          'groupId',
          {} as UpdateGroupDto,
          { id: 'userId' } as User,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if the new owner is not found', async () => {
      const currentUser = { id: 'user1' } as User;

      const currentGroup = { id: 'group1', owner: currentUser } as Group;
      const updateGroupDto = { ownerId: 'user2' } as UpdateGroupDto;

      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(currentGroup);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null); // Simulating user not found

      await expect(
        service.update('group1', updateGroupDto, currentUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if no remaining users to assign as the new owner', async () => {
      const currentUser = { id: 'user1' } as User;
      const removeMemberIds = ['user1'];

      const currentGroup = { id: 'group1', owner: currentUser } as Group;
      const updateGroupDto = {
        removeMemberId: removeMemberIds,
      } as UpdateGroupDto;

      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(currentGroup);
      jest
        .spyOn(groupRepository.manager.connection, 'createQueryRunner')
        .mockReturnValue({
          connect: jest.fn(),
          startTransaction: jest.fn(),
          commitTransaction: jest.fn(),
          rollbackTransaction: jest.fn(),
          release: jest.fn(),
          manager: {
            save: jest.fn(),
            delete: jest.fn(),
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        } as unknown as QueryRunner);

      await expect(
        service.update('group1', updateGroupDto, currentUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should remove members from the group and commit the transaction', async () => {
      const currentUser = { id: 'user1' } as User;
      const removeMemberIds = ['user2'];

      const currentGroup = {
        id: 'group1',
        owner: currentUser,
        userGroups: [
          {
            user: {
              id: 'memberId1',
            },
          },
          {
            user: {
              id: 'user2',
            },
          },
        ],
      } as Group;
      const updateGroupDto = {
        removeMemberId: removeMemberIds,
      } as UpdateGroupDto;

      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(currentGroup);
      jest.spyOn(groupRepository, 'save').mockResolvedValue(currentGroup);

      const queryRunnerMock = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          find: jest.fn().mockResolvedValue([{ userId: 'user2' }]), // Remaining user to reassign ownership
          delete: jest.fn(),
        },
      };

      jest
        .spyOn(groupRepository.manager.connection, 'createQueryRunner')
        .mockReturnValue(queryRunnerMock as unknown as QueryRunner);

      await service.update('group1', updateGroupDto, currentUser);

      expect(queryRunnerMock.manager.delete).toHaveBeenCalledWith(UserGroup, {
        userId: In(removeMemberIds),
        groupId: currentGroup.id,
      });
      expect(queryRunnerMock.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('delete group', () => {
    it('should delete group successfully', async () => {
      const group = { id: 'groupId', owner: { id: 'userId' } } as Group;

      const user1 = { userId: 'userId1' } as UserGroup;
      const user2 = { userId: 'userId2' } as UserGroup;

      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(group);
      jest.spyOn(userGroupRepository, 'find').mockResolvedValue([user1, user2]);
      jest.spyOn(userGroupRepository, 'remove').mockResolvedValue(null);
      jest.spyOn(groupRepository, 'delete').mockResolvedValue(null);

      const result = await service.remove('groupId', { id: 'userId' } as User);

      expect(result.message).toBe('Group deleted');
      expect(groupRepository.delete).toHaveBeenCalledWith({ id: 'groupId' });
    });

    it('should throw NotFoundException if group is not found', async () => {
      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(undefined);

      await expect(
        service.remove('groupId', { id: 'userId' } as User),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      const group = { id: 'groupId', owner: { id: 'otherUserId' } } as Group;
      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(group);

      await expect(
        service.remove('groupId', { id: 'userId' } as User),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if the group is not found', async () => {
      const user = { id: 'user1' } as User;

      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(null); // Simulate group not found

      await expect(service.findOne('group1', user)).rejects.toThrowError(
        NotFoundException,
      );
    });

    it('should return the group with members including the current user marked', async () => {
      const user = { id: 'user1' } as User;
      const group = {
        id: 'group1',
        name: 'Test Group',
        owner: { id: 'user2' } as User,
        userGroups: [
          {
            userId: 'user1',
            user: { id: 'user1' } as User,
            joinedAt: new Date(),
          },
          {
            userId: 'user2',
            user: { id: 'user2' } as User,
            joinedAt: new Date(),
          },
        ],
      } as Group;

      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(group);

      const result = await service.findOne('group1', user);

      expect(result.group).toBeDefined();
      expect(result.group.owner.id).toBe('user2');
      expect(result.group.members.length).toBe(2);
      expect(result.group.members[0].current).toBe(true);
      expect(result.group.members[1].current).toBe(false);
    });
  });

  describe('leaveGroup', () => {
    it('should throw NotFoundException if the group is not found', async () => {
      const user = { id: 'user1' } as User;

      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(null); // Simulate group not found

      await expect(service.leaveGroup('group1', user)).rejects.toThrowError(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if the user is the owner of the group', async () => {
      const user = { id: 'user1' } as User;
      const group = { id: 'group1', owner: { id: 'user1' } } as Group;

      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(group); // Simulating user as owner

      await expect(service.leaveGroup('group1', user)).rejects.toThrowError(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if the user is not a member of the group', async () => {
      const user = { id: 'user1' } as User;
      const group = { id: 'group1', owner: { id: 'user2' } } as Group;

      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(group);
      jest.spyOn(userGroupRepository, 'find').mockResolvedValue([]); // Simulating user not part of the group

      await expect(service.leaveGroup('group1', user)).rejects.toThrowError(
        BadRequestException,
      );
    });

    it('should successfully allow the user to leave the group', async () => {
      const user = { id: 'user1' } as User;
      const group = { id: 'group1', owner: { id: 'user2' } } as Group;

      const userGroup = { userId: 'user1', groupId: 'group1' } as UserGroup;

      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(group);
      jest.spyOn(userGroupRepository, 'find').mockResolvedValue([userGroup]); // Simulating user is part of the group
      jest
        .spyOn(userGroupRepository, 'delete')
        .mockResolvedValue({ affected: 1 } as any); // Simulate successful deletion

      const result = await service.leaveGroup('group1', user);

      expect(result.message).toBe('You have left the group');
      expect(userGroupRepository.delete).toHaveBeenCalledWith({
        userId: user.id,
        groupId: group.id,
      });
    });
  });

  describe('followGroup', () => {
    it('should throw NotFoundException if the group is not found', async () => {
      const user = { id: 'user1' } as User;
      const followGroupDto = { follow: true } as FollowGroupDto;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null); // Simulating group not found

      await expect(
        service.followGroup('group1', user, followGroupDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if the user is the owner or a member of the group', async () => {
      const user = { id: 'user1' } as User;
      const group = {
        id: 'group1',
        owner: { id: 'user1' } as User,
        userGroups: [{ userId: 'user1' }],
      } as Group;
      const followGroupDto = { follow: true } as FollowGroupDto;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(user);
      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(group);

      const mockEntityManager = {
        findOne: jest.fn().mockResolvedValueOnce(null),
        queryRunner: {
          manager: {
            delete: jest.fn(),
            findOne: jest.fn().mockResolvedValue({
              ...group,
            }),
          },
        },
      } as unknown as EntityManager;

      groupRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      await expect(
        service.followGroup('group1', user, followGroupDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully allow the user to follow the group', async () => {
      const user = { id: 'user1' } as User;
      const group = {
        id: 'group1',
        owner: { id: 'user2' } as User,
        userGroups: [{ userId: 'user2' }],
        followers: [],
      } as Group;
      const followGroupDto = { follow: true } as FollowGroupDto;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(user);
      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(group);

      const mockEntityManager = {
        findOne: jest.fn().mockResolvedValueOnce(null),
        queryRunner: {
          manager: {
            delete: jest.fn(),
            findOne: jest
              .fn()
              .mockResolvedValueOnce({
                ...group,
              })
              .mockResolvedValueOnce({
                ...group,
                followers: [
                  {
                    userId: 'user1',
                    groupId: '',
                    user: new User(),
                    group: new Group(),
                  },
                ],
              }),
            save: jest.fn(),
          },
        },
      } as unknown as EntityManager;

      groupRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      const result = await service.followGroup('group1', user, followGroupDto);

      expect(result.followed).toBe(true);
    });

    it('should successfully allow the user to unfollow the group', async () => {
      const user = { id: 'user1' } as User;
      const group = {
        id: 'group1',
        owner: { id: 'user2' } as User,
        userGroups: [{ userId: 'user2' }],
        followers: [{ userId: 'user1' }] as FollowedGroup[],
      } as Group;
      const followGroupDto = { follow: false } as FollowGroupDto;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(user);
      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(group);

      const mockEntityManager = {
        findOne: jest.fn().mockResolvedValueOnce(null),
        queryRunner: {
          manager: {
            delete: jest.fn(),
            findOne: jest
              .fn()
              .mockResolvedValueOnce({
                ...group,
              })
              .mockResolvedValueOnce({
                ...group,
                followers: [],
              }),
            save: jest.fn(),
          },
        },
      } as unknown as EntityManager;

      groupRepository.manager.transaction = jest
        .fn()
        .mockImplementation(async (cb) => cb(mockEntityManager));

      const result = await service.followGroup('group1', user, followGroupDto);

      expect(result.followed).toBe(false);
    });
  });

  describe('checkFollowGroup', () => {
    it('should throw NotFoundException if the group is not found', async () => {
      const user = { id: 'user1' } as User;

      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(null); // Simulating group not found

      await expect(service.checkFollowGroup('group1', user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return true if the user is following the group', async () => {
      const user = { id: 'user1' } as User;
      const group = {
        id: 'group1',
        followers: [{ userId: 'user1' }] as FollowedGroup[],
      } as Group;

      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(group); // Simulating user is a follower

      const result = await service.checkFollowGroup('group1', user);

      expect(result.followed).toBe(true);
    });

    it('should return false if the user is not following the group', async () => {
      const user = { id: 'user1' } as User;
      const group = {
        id: 'group1',
        followers: [],
      } as Group;

      jest.spyOn(groupRepository, 'findOne').mockResolvedValue(group); // Simulating user is not a follower

      const result = await service.checkFollowGroup('group1', user);

      expect(result.followed).toBe(false);
    });
  });
});
