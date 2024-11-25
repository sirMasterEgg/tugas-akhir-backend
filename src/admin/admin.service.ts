import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { FindOptionsWhere, ILike, IsNull, Repository } from 'typeorm';
import { TrimmedUserMapper } from '../mapper/trimmed-user.entity';
import { MetadataMapper } from '../mapper/metadata-mapper.entity';
import { UserRoleEnum } from '../enums/user-role.enum';
import { DoActionOnUsersDto } from './dto/do-action-on-users.dto';
import {
  PunishmentStatus,
  UserPunishmentStatusEnum,
} from './entities/user-status.entity';
import {
  Report,
  ReportedPostType,
  ReportStatus,
} from '../report/entities/report.entity';
import { ReportMapperImpl } from '../mapper/report-mapper.entity';
import { DoActionOnReportsDto } from './dto/do-action-on-reports.dto';
import { Question } from '../user/entities/question.entity';
import { QuestionReply } from '../question-reply/entities/question-reply.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Events } from '../post-ws/enums/ws-message.enum';
import { NotificationObserverDto } from '../notification-observer/dto/NotificationObserverDto';
import { ConfigService } from '@nestjs/config';
import { AddAdminDto } from './dto/add-admin.dto';
import { hashSync } from 'bcrypt';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(PunishmentStatus)
    private readonly userPunishmentRepository: Repository<PunishmentStatus>,
    private configService: ConfigService,
    private readonly eventEmmiter: EventEmitter2,
  ) {}

  async getAllUsers(
    page: number,
    size: number,
    filter: string,
    search: string,
  ) {
    if (!page || page < 1) page = 1;
    const take: number = size || 10;
    const skip = (page - 1) * take;

    let queryFilter: FindOptionsWhere<User> | FindOptionsWhere<User>[];
    if (!filter) {
      filter = 'all';
    }
    switch (filter) {
      case 'all':
        queryFilter = {};
        break;
      case 'active':
        queryFilter = {
          status: {
            userStatus: IsNull(),
          },
        };
        break;
      case 'banned':
        queryFilter = {
          status: {
            userStatus: UserPunishmentStatusEnum.BANNED,
          },
        };
        break;
      case 'warned':
        queryFilter = {
          status: {
            userStatus: UserPunishmentStatusEnum.WARNED,
          },
        };
        break;
      case 'timeout':
        queryFilter = {
          status: {
            userStatus: UserPunishmentStatusEnum.TIMEOUT,
          },
        };
        break;
      default:
        throw new BadRequestException('Invalid filter');
    }

    const [users, usersCount] = await this.userRepository.findAndCount({
      where: {
        role: UserRoleEnum.USER,
        ...(search && { username: ILike(`%${search}%`) }),
        ...queryFilter,
      },
      skip,
      take,
    });

    return {
      users: TrimmedUserMapper.fromUserList(users),
      meta: MetadataMapper.fromMetadata({
        page,
        totalPage: Math.ceil(usersCount / take),
      }),
    };
  }

  async doActionOnUsers(body: DoActionOnUsersDto) {
    const { action, userId } = body;

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    let punishmentStatus = await this.userPunishmentRepository.findOne({
      where: {
        user: {
          id: userId,
        },
      },
    });

    if (action === 'unban') {
      if (!punishmentStatus) {
        throw new BadRequestException('User is not banned');
      }

      await this.userPunishmentRepository.delete({ user });

      this.eventEmmiter.emit(
        Events.NOTIFICATION_CREATED,
        NotificationObserverDto.forAdminWarning({
          room: [user.id],
          adminMessage: '`You have been unbanned`',
        }),
      );

      return {
        message: 'User unbanned',
      };
    }

    if (!punishmentStatus) {
      punishmentStatus = new PunishmentStatus();
      punishmentStatus.user = user;
    }

    switch (action) {
      case 'ban':
        punishmentStatus.userStatus = UserPunishmentStatusEnum.BANNED;
        punishmentStatus.expired = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        );
        await this.userPunishmentRepository.save(punishmentStatus);

        this.eventEmmiter.emit(
          Events.NOTIFICATION_CREATED,
          NotificationObserverDto.forAdminWarning({
            room: [user.id],
            adminMessage: '`You have been banned`',
          }),
        );

        return {
          message: 'User banned',
        };
      case 'warn':
        punishmentStatus.userStatus = UserPunishmentStatusEnum.WARNED;
        punishmentStatus.expired = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        );
        await this.userPunishmentRepository.save(punishmentStatus);

        this.eventEmmiter.emit(
          Events.NOTIFICATION_CREATED,
          NotificationObserverDto.forAdminWarning({
            room: [user.id],
            adminMessage: '`You have been warned`',
          }),
        );

        return {
          message: 'User warned',
        };
      case 'timeout':
        punishmentStatus.userStatus = UserPunishmentStatusEnum.TIMEOUT;
        punishmentStatus.expired = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        );
        await this.userPunishmentRepository.save(punishmentStatus);

        this.eventEmmiter.emit(
          Events.NOTIFICATION_CREATED,
          NotificationObserverDto.forAdminWarning({
            room: [user.id],
            adminMessage: '`You have been timed out`',
          }),
        );

        return {
          message: 'User timeout',
        };
      default:
        throw new BadRequestException('Invalid action');
    }
  }

  async getReports(page: number, size: number, filter: string, q: string) {
    if (!page || page < 1) page = 1;
    const take: number = size || 10;
    const skip = (page - 1) * take;

    let queryFilter: FindOptionsWhere<Report> | FindOptionsWhere<Report>[];
    if (!filter) {
      filter = 'all';
    }
    switch (filter) {
      case 'all':
        queryFilter = {};
        break;
      case 'resolved':
        queryFilter = {
          reportStatus: ReportStatus.RESOLVED,
        };
        break;
      case 'pending':
        queryFilter = {
          reportStatus: ReportStatus.PENDING,
        };
        break;
      case 'rejected':
        queryFilter = {
          reportStatus: ReportStatus.REJECTED,
        };
        break;
      default:
        throw new BadRequestException('Invalid filter');
    }

    const [reports, reportsCount] = await this.reportRepository.findAndCount({
      where: {
        ...(q && { reason: ILike(`%${q}%`) }),
        ...queryFilter,
      },
      relations: ['reporter', 'reportedUser', 'reportedUser.user'],
      order: {
        createdAt: 'desc',
        updatedAt: 'desc',
      },
      skip,
      take,
    });

    return {
      reports: ReportMapperImpl.fromReportList(reports),
      meta: MetadataMapper.fromMetadata({
        page,
        totalPage: Math.ceil(reportsCount / take),
      }),
    };
  }

  async doActionOnReports(body: DoActionOnReportsDto) {
    const { action, reportId } = body;

    await this.reportRepository.manager.transaction(async (queryRunner) => {
      const report = await queryRunner.queryRunner.manager.findOne(Report, {
        where: {
          id: reportId,
        },
        relations: ['reporter', 'reportedUser', 'reportedUser.user'],
      });

      if (!report) {
        throw new BadRequestException('Report not found');
      }

      if (report.reportStatus !== ReportStatus.PENDING) {
        throw new BadRequestException('Report already resolved');
      }

      if (action === 'reject') {
        report.reportStatus = ReportStatus.REJECTED;
        await queryRunner.queryRunner.manager.save(report);
        return {
          message: 'Successfully rejected report',
        };
      }

      switch (action) {
        case 'timeout':
          await this.doActionOnUsers({
            action: 'timeout',
            userId: report.reportedUser.user.id,
          });
          break;
        case 'warn':
          await this.doActionOnUsers({
            action: 'warn',
            userId: report.reportedUser.user.id,
          });
          break;
        case 'ban':
          await this.doActionOnUsers({
            action: 'ban',
            userId: report.reportedUser.user.id,
          });
          break;
        default:
          throw new BadRequestException('Invalid action');
      }

      report.reportStatus = ReportStatus.RESOLVED;
      return await queryRunner.queryRunner.manager.save(report);
    });

    return {
      message: 'Successfully resolved report',
    };
  }

  async getReportPreview(reportId: string) {
    const data = await this.reportRepository.manager.transaction(
      async (queryRunner) => {
        const report = await queryRunner.queryRunner.manager.findOne(Report, {
          where: {
            id: reportId,
          },
        });

        if (!report) {
          throw new BadRequestException('Report not found');
        }

        if (report.reportedPostType === ReportedPostType.QUESTION) {
          const question = await queryRunner.queryRunner.manager.findOne(
            Question,
            {
              where: {
                id: report.reportedPostId,
              },
              relations: ['files'],
            },
          );

          return {
            question,
          };
        }
        if (report.reportedPostType === ReportedPostType.REPLY) {
          const reply = await queryRunner.queryRunner.manager.findOne(
            QuestionReply,
            {
              where: {
                id: report.reportedPostId,
              },
            },
          );

          return {
            reply,
          };
        }
      },
    );

    return {
      reply: data.reply,
      question: data.question,
    };
  }

  async getManagePage(page: number, size: number, q: string, key: string) {
    if (!page || page < 1) page = 1;
    const take: number = size || 10;
    const skip = (page - 1) * take;

    if (key !== this.configService.get<string>('ADMIN_KEY')) {
      throw new UnauthorizedException('Invalid admin key');
    }

    const [users, usersCount] = await this.userRepository.findAndCount({
      where: {
        role: UserRoleEnum.ADMIN,
        ...(q && { username: ILike(`%${q}%`) }),
      },
      skip,
      take,
    });

    return {
      users: TrimmedUserMapper.fromUserList(users),
      meta: MetadataMapper.fromMetadata({
        page,
        totalPage: Math.ceil(usersCount / take),
      }),
    };
  }

  async doActionOnManagePage(body: AddAdminDto) {
    if (body.key !== this.configService.get<string>('ADMIN_KEY')) {
      throw new UnauthorizedException('Invalid admin key');
    }

    try {
      const user = this.userRepository.create({
        name: body.name,
        username: body.username,
        email: body.email,
        password: hashSync(body.password, 10),
        birthday: new Date(),
        acceptQuestion: false,
        role: UserRoleEnum.ADMIN,
      });

      await this.userRepository.save(user);
      return { message: 'Admin added' };
    } catch (e) {
      throw new BadRequestException('Failed to add admin');
    }
  }

  async deleteAdmin(id: string, key: string) {
    if (key !== this.configService.get<string>('ADMIN_KEY')) {
      throw new UnauthorizedException('Invalid admin key');
    }

    const user = await this.userRepository.findOne({
      where: { id, role: UserRoleEnum.ADMIN },
    });

    if (!user) {
      throw new NotFoundException('Admin not found');
    }

    await this.userRepository.delete(user.id);
    return { message: 'Admin deleted' };
  }

  async updateAdmin(id: string, body: UpdateAdminDto) {
    if (body.key !== this.configService.get<string>('ADMIN_KEY')) {
      throw new UnauthorizedException('Invalid admin key');
    }

    const user = await this.userRepository.findOne({
      where: { id, role: UserRoleEnum.ADMIN },
    });

    if (!user) {
      throw new NotFoundException('Admin not found');
    }

    if (body.name) user.name = body.name;
    if (body.username) user.username = body.username;
    if (body.email) user.email = body.email;
    if (body.password) user.password = hashSync(body.password, 10);

    await this.userRepository.save(user);
    return { message: 'Admin updated' };
  }

  checkKey(key: string) {
    if (key !== this.configService.get<string>('ADMIN_KEY')) {
      throw new UnauthorizedException('Invalid admin key');
    }
    return { message: 'Valid key' };
  }
}
