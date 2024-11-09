import { Module } from '@nestjs/common';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';
import { UserGroup } from './entities/user-group.entity';
import { User } from '../user/entities/user.entity';
import { FollowedGroup } from './entities/followed-group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Group, UserGroup, User, FollowedGroup])],
  controllers: [GroupController],
  providers: [GroupService, JwtService],
})
export class GroupModule {}
