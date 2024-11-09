import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportedPostType, ReportType } from './entities/report.entity';
import { User } from '../user/entities/user.entity';
import { ReportUser } from './entities/report-user.entity';
import { QuestionReply } from '../question-reply/entities/question-reply.entity';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(QuestionReply)
    private readonly questionReplyRepository: Repository<QuestionReply>,
  ) {}

  async create(createReportDto: CreateReportDto, user: User) {
    const currentUser = await this.userRepository.findOne({
      where: { id: user.id },
    });

    if (
      !createReportDto.userId &&
      !createReportDto.postId &&
      !createReportDto.replyId
    ) {
      throw new BadRequestException('User or post id is required');
    }

    if (
      createReportDto.userId &&
      createReportDto.postId &&
      createReportDto.replyId
    ) {
      throw new BadRequestException(
        'You can only report either a user or a post',
      );
    }

    let reportedUser: User = null;

    if (createReportDto.userId || createReportDto.postId) {
      reportedUser = await this.userRepository.findOne({
        where: {
          ...(createReportDto.userId && { id: createReportDto.userId }),
          ...(createReportDto.postId && {
            questions: { id: createReportDto.postId },
          }),
        },
        relations: ['questions'],
      });
    } else if (createReportDto.replyId) {
      const reportedReply = await this.questionReplyRepository.findOne({
        where: {
          id: createReportDto.replyId,
        },
        relations: ['owner'],
      });
      reportedUser = reportedReply.owner;
    }

    if (!reportedUser) {
      throw new BadRequestException('User or post or reply not found');
    }

    if (reportedUser.id === currentUser.id) {
      throw new BadRequestException('You cannot report yourself');
    }

    const transaction = await this.reportRepository.manager.transaction(
      async (transactionalEntityManager) => {
        const report = new Report();
        report.reporter = currentUser;

        if (createReportDto.postId) {
          report.reportedPostId = createReportDto.postId;
          report.reportedPostType = ReportedPostType.QUESTION;
        }

        if (createReportDto.replyId) {
          report.reportedPostId = createReportDto.replyId;
          report.reportedPostType = ReportedPostType.REPLY;
        }

        report.reportType = createReportDto.userId
          ? ReportType.USER
          : ReportType.CONTENT;
        const savedReport = await transactionalEntityManager.save(
          Report,
          report,
        );

        const reportUser = new ReportUser();
        reportUser.report = savedReport;
        reportUser.user = reportedUser;
        await transactionalEntityManager.save(ReportUser, reportUser);

        return savedReport;
      },
    );

    return {
      message: `Report created successfully with report id ${transaction.id}`,
      id: transaction.id,
    };
  }
}
