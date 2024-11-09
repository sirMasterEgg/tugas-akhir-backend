import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { AuthWithRoles } from '../auth/auth.decorator';
import { FollowGroupDto } from './dto/follow-group.dto';

@AuthWithRoles('user')
@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() createGroupDto: CreateGroupDto) {
    return this.groupService.create(user, createGroupDto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.groupService.findAll(user);
  }

  @Patch(':id/leave')
  leaveGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.groupService.leaveGroup(id, user);
  }

  @Post(':id/follow')
  followGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() followGroupDto: FollowGroupDto,
  ) {
    return this.groupService.followGroup(id, user, followGroupDto);
  }

  @Get(':id/check-follow')
  checkFollowGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.groupService.checkFollowGroup(id, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.groupService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @CurrentUser() user: User,
  ) {
    return this.groupService.update(id, updateGroupDto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.groupService.remove(id, user);
  }
}
