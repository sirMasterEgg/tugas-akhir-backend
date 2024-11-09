import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { User } from '../user/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';
import { In, Repository } from 'typeorm';
import { UserGroup } from './entities/user-group.entity';
import { CreateGroupResponseDto } from './dto/response/create-group-response.dto';
import { GetGroupResponseDto } from './dto/response/get-group-response.dto';
import { DeleteGroupResponseDto } from './dto/response/delete-group-response.dto';
import { TrimmedUser, TrimmedUserMapper } from '../mapper/trimmed-user.entity';
import { customAlphabet } from 'nanoid';
import { TrimmedGroupMapper } from '../mapper/trimmed-group.entity';
import { GetSingleGroupResponseDto } from './dto/response/get-single-group-response.dto';
import { FollowGroupDto } from './dto/follow-group.dto';
import { FollowedGroup } from './entities/followed-group.entity';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group) private groupRepository: Repository<Group>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(UserGroup)
    private userGroupRepository: Repository<UserGroup>,
  ) {}

  setGroupIdentifier(groupName: string): string {
    const randomAlphabet = customAlphabet(
      '1234567890abcdefghijklmnopqrstuvwxyz',
      4,
    );
    return groupName.toLowerCase().replace(/\s/g, '-') + '-' + randomAlphabet();
  }

  async create(
    currentUser: User,
    createGroupDto: CreateGroupDto,
  ): Promise<CreateGroupResponseDto> {
    const group = new Group();
    group.name = createGroupDto.groupName;
    group.identifier = this.setGroupIdentifier(createGroupDto.groupName);

    const owner = new User();
    owner.id = currentUser.id;

    group.owner = owner;

    const createdGroup = await this.groupRepository.save(group);

    const members = [currentUser.id, ...createGroupDto.memberId].map(
      (userId) => {
        const userGroup = new UserGroup();
        userGroup.userId = userId;
        userGroup.groupId = group.id;
        userGroup.joinedAt = new Date();
        return userGroup;
      },
    );

    group.userGroups = await this.userGroupRepository.save(members);

    const results = await this.groupRepository.findOne({
      where: {
        id: createdGroup.id,
      },
      relations: ['owner', 'userGroups.user'],
      loadEagerRelations: true,
    });

    return {
      id: results.id,
      name: results.name,
      identifier: results.identifier,
      owner: TrimmedUserMapper.fromUser(results.owner),
      members: results.userGroups.map((userGroup) => {
        return {
          ...TrimmedUserMapper.fromUser(userGroup.user),
          joinedAt: userGroup.joinedAt,
        };
      }),
    };
  }

  async findAll(currentUser: User): Promise<GetGroupResponseDto> {
    const groups = await this.groupRepository.find({
      where: {
        userGroups: {
          userId: currentUser.id,
        },
      },
    });

    const results = await this.groupRepository.find({
      where: {
        id: In(groups.map((group) => group.id)),
      },
      loadEagerRelations: true,
      relations: ['owner', 'userGroups.user'],
    });

    return {
      groups: results.map((group) => {
        return {
          id: group.id,
          name: group.name,
          identifier: group.identifier,
          owner: TrimmedUserMapper.fromUser(group.owner),
          members: group.userGroups.map((userGroup) => {
            return {
              ...TrimmedUserMapper.fromUser(userGroup.user),
              joinedAt: userGroup.joinedAt,
            };
          }),
        };
      }),
    };
  }

  async update(
    id: string,
    updateGroupDto: UpdateGroupDto,
    currentUser: User,
  ): Promise<CreateGroupResponseDto> {
    const currentGroup = await this.groupRepository.findOne({
      where: {
        id: id,
      },
      relations: ['owner'],
    });

    if (!currentGroup) {
      throw new NotFoundException('Group not found');
    }

    if (currentUser.id !== currentGroup.owner.id) {
      throw new ForbiddenException('You are not the owner of this group');
    }

    if (updateGroupDto.groupName) {
      currentGroup.name = updateGroupDto.groupName;
      currentGroup.identifier = this.setGroupIdentifier(
        updateGroupDto.groupName,
      );
    }
    if (updateGroupDto.ownerId) {
      const newOwner = await this.userRepository.findOne({
        where: {
          id: updateGroupDto.ownerId,
        },
      });

      if (!newOwner) {
        throw new NotFoundException('User not found');
      }

      currentGroup.owner = newOwner;
    }

    const updatedGroup = await this.groupRepository.save(currentGroup);

    const queryRunner =
      this.groupRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      if (updateGroupDto.memberId && updateGroupDto.memberId.length > 0) {
        const newUserGroups = updateGroupDto.memberId.map((userId) => {
          const userGroup = new UserGroup();
          userGroup.userId = userId;
          userGroup.group = currentGroup;
          userGroup.joinedAt = new Date();
          return userGroup;
        });

        await queryRunner.manager.save(UserGroup, newUserGroups);
      }
      if (
        updateGroupDto.removeMemberId &&
        updateGroupDto.removeMemberId.length > 0
      ) {
        if (updateGroupDto.removeMemberId.includes(currentGroup.owner.id)) {
          const remainingUsers = (
            await queryRunner.manager.find(UserGroup, {
              where: {
                groupId: currentGroup.id,
              },
            })
          ).filter(
            (member) => !updateGroupDto.removeMemberId.includes(member.userId),
          );

          if (remainingUsers.length > 0) {
            const newOwnerUserGroup = remainingUsers[0]; // Pick the first user as the new owner
            const newOwner = await queryRunner.manager.findOne(User, {
              where: {
                id: newOwnerUserGroup.userId,
              },
            });

            await queryRunner.manager.update(Group, currentGroup.id, {
              owner: newOwner,
            });
          } else {
            throw new BadRequestException(
              'No remaining users to assign as the new owner',
            );
          }
        }
        await queryRunner.manager.delete(UserGroup, {
          userId: In(updateGroupDto.removeMemberId),
          groupId: currentGroup.id,
        });
      }
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    const results = await this.groupRepository.findOne({
      where: {
        id: updatedGroup.id,
      },
      relations: ['owner', 'userGroups', 'userGroups.user'],
      loadEagerRelations: true,
    });

    return {
      id: results.id,
      name: results.name,
      identifier: results.identifier,
      owner: TrimmedUserMapper.fromUser(results.owner),
      members: results.userGroups.map((userGroup) => {
        return {
          ...TrimmedUserMapper.fromUser(userGroup.user),
          joinedAt: userGroup.joinedAt,
        };
      }),
    };
  }

  async remove(id: string, currentUser: User): Promise<DeleteGroupResponseDto> {
    const currentGroup = await this.groupRepository.findOne({
      where: {
        id: id,
      },
      relations: ['owner'],
    });

    if (!currentGroup) {
      throw new NotFoundException('Group not found');
    }

    if (currentUser.id !== currentGroup.owner.id) {
      throw new ForbiddenException('You are not the owner of this group');
    }

    const userGroups = await this.userGroupRepository.find({
      where: {
        groupId: id,
      },
    });

    await this.userGroupRepository.remove(userGroups);

    await this.groupRepository.delete({
      id: id,
    });

    return {
      message: 'Group deleted',
    };
  }

  async findOne(id: string, user: User): Promise<GetSingleGroupResponseDto> {
    const group = await this.groupRepository.findOne({
      where: {
        id: id,
      },
      relations: ['owner', 'userGroups', 'userGroups.user'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return {
      group: {
        ...TrimmedGroupMapper.fromGroup(group),
        owner: TrimmedUserMapper.fromUser(group.owner),
        members: group.userGroups.map(
          (userGroup): TrimmedUser & { joinedAt: Date; current: boolean } => {
            return {
              ...TrimmedUserMapper.fromUser(userGroup.user),
              joinedAt: userGroup.joinedAt,
              current: userGroup.userId === user.id,
            };
          },
        ),
      },
    };
  }

  async leaveGroup(id: string, user: User) {
    const group = await this.groupRepository.findOne({
      where: {
        id: id,
      },
      relations: ['owner'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.owner.id === user.id) {
      throw new ForbiddenException('Owner cannot leave the group');
    }

    const userGroups = await this.userGroupRepository.find({
      where: {
        userId: user.id,
        groupId: id,
      },
    });

    if (userGroups.length === 0) {
      throw new BadRequestException('You are not a member of this group');
    }

    await this.userGroupRepository.delete({
      userId: user.id,
      groupId: id,
    });

    return {
      message: 'You have left the group',
    };
  }

  async followGroup(id: string, user: User, followGroupDto: FollowGroupDto) {
    user = await this.userRepository.findOne({
      where: {
        id: user.id,
      },
    });

    const group = await this.groupRepository.findOne({
      where: {
        id,
      },
      relations: ['followers', 'followers.user', 'userGroups', 'owner'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    /*
    if (
      group.owner.id === user.id ||
      group.userGroups.some((userGroup) => userGroup.userId === user.id)
    ) {
      throw new ForbiddenException('Owner and members cannot follow the group');
    }*/

    const savedGroup = await this.groupRepository.manager.transaction(
      async (transaction) => {
        const freshGroup = await transaction.queryRunner.manager.findOne(
          Group,
          {
            where: { id: group.id },
            relations: ['followers', 'followers.user', 'userGroups', 'owner'],
          },
        );

        if (!freshGroup) {
          throw new NotFoundException('Group not found');
        }

        if (
          freshGroup.owner.id === user.id ||
          freshGroup.userGroups.some(
            (userGroup) => userGroup.userId === user.id,
          )
        ) {
          throw new ForbiddenException(
            'Owner and members cannot follow the group',
          );
        }

        freshGroup.followers = freshGroup.followers.filter(
          (follower) => follower.userId !== user.id,
        );

        if (followGroupDto.follow) {
          const followers = new FollowedGroup();
          followers.groupId = freshGroup.id;
          followers.userId = user.id;
          followers.group = freshGroup;
          followers.user = user;

          await transaction.queryRunner.manager.save(FollowedGroup, followers);
        } else {
          await transaction.queryRunner.manager.delete(FollowedGroup, {
            userId: user.id,
            groupId: freshGroup.id,
          });
        }

        return transaction.queryRunner.manager.findOne(Group, {
          where: { id: freshGroup.id },
          relations: ['followers', 'followers.user', 'userGroups', 'owner'],
        });
      },
    );

    return {
      followed: savedGroup.followers.some(
        (followers) => followers.userId === user.id,
      ),
    };
  }

  async checkFollowGroup(id: string, user: User) {
    const group = await this.groupRepository.findOne({
      where: {
        id,
      },
      relations: ['followers'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return {
      followed: group.followers.some(
        (followers) => followers.userId === user.id,
      ),
    };
  }
}
