import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { CurrentUser } from '../current-user/current-user.decorator';
import { ToggleStatusDto } from './dto/toggle-status.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthWithRoles } from '../auth/auth.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ImageDimensionValidator } from '../validator/image-dimension.validator';
import { memoryStorage } from 'multer';
import { FollowDto } from './dto/follow.dto';

@AuthWithRoles('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/notification')
  getAllNotifications(@CurrentUser() user: User, @Query('page') page: string) {
    return this.userService.getAllNotifications(user, +page);
  }

  @Post('/notification')
  @HttpCode(HttpStatus.OK)
  markAsRead(
    @CurrentUser() user: User,
    @Body('notificationId') notificationId: string,
  ) {
    return this.userService.markAsRead(user, notificationId);
  }

  @Get('/current')
  getCurrentUser(@CurrentUser() user: User) {
    return this.userService.getCurrentUser(user.id, 'id');
  }

  @Patch('/current')
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      storage: memoryStorage(),
    }),
  )
  @HttpCode(HttpStatus.OK)
  updateCurrentUser(
    @CurrentUser() user: User,
    @Body() updatedUser: UpdateProfileDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'jpeg|png|jpg',
        })
        .addValidator(
          new ImageDimensionValidator({
            ratio: 1,
          }),
        )
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: false,
        }),
    )
    profilePicture: Express.Multer.File,
  ) {
    return this.userService.updateCurrentUser(
      user,
      updatedUser,
      profilePicture,
    );
  }

  @Post('/toggle-status')
  @HttpCode(HttpStatus.OK)
  toggleStatus(
    @CurrentUser() user: User,
    @Body() toggleStatus: ToggleStatusDto,
  ) {
    return this.userService.toggleStatus(user, toggleStatus);
  }

  /*@Post('/ask')
  @UseInterceptors(FilesInterceptor('files', 20))
  @HttpCode(HttpStatus.OK)
  askQuestion(
    @CurrentUser() user: User,
    @Body() askDto: AskDto,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'jpeg|png|jpg',
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: false,
        }),
    )
    files: Array<Express.Multer.File>,
  ) {
    return this.userService.askQuestion(user, askDto, files);
  }*/

  @Post('/block')
  @HttpCode(HttpStatus.OK)
  blockUser(@CurrentUser() user: User, @Body() blockUser: BlockUserDto) {
    return this.userService.blockUser(user, blockUser);
  }

  @Post('/follow')
  @HttpCode(HttpStatus.OK)
  followUser(@CurrentUser() user: User, @Body() followUserDto: FollowDto) {
    return this.userService.followUser(user, followUserDto);
  }

  @Get('/follow-status/:userId')
  getFollowStatus(@CurrentUser() user: User, @Param('userId') userId: string) {
    return this.userService.getFollowStatus(user, userId);
  }

  @Get('/block-status/:userId')
  getBlockStatus(@CurrentUser() user: User, @Param('userId') userId: string) {
    return this.userService.getBlockStatus(user, userId);
  }

  @Get('/question')
  getAllQuestions(@CurrentUser() user: User, @Query('page') page: string) {
    return this.userService.getAllQuestions(user, +page);
  }

  @Get('/question/:userId')
  getQuestions(
    @CurrentUser() user: User,
    @Param('userId') userId: string,
    @Query('page') page: string,
  ) {
    return this.userService.getQuestions(user, userId, +page);
  }

  @Get('/blocked-user')
  getBlockedUsers(@CurrentUser() user: User, @Query('page') page: string) {
    return this.userService.getBlockedUsers(user, +page);
  }

  @Get('/:username')
  getOtherUser(@Param('username') username: string, @CurrentUser() user: User) {
    return this.userService.getCurrentUser(username, 'username', user);
  }
}
