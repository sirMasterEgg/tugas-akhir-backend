import {
  Report,
  ReportStatus,
  ReportType,
} from '../report/entities/report.entity';
import { TrimmedUserMapper } from './trimmed-user.entity';

export interface ReportMapper
  extends Omit<Report, 'reporter' | 'reportedUser'> {
  reporter: TrimmedUserMapper;
  reportedUser: TrimmedUserMapper;
}

export class ReportMapperImpl implements ReportMapper {
  static fromReport(report: Report): ReportMapper {
    return {
      id: report.id,
      reportStatus: report.reportStatus,
      reporter: TrimmedUserMapper.fromUser(report.reporter),
      reportedUser: TrimmedUserMapper.fromUser(report.reportedUser.user),
      reportType: report.reportType,
      reportedPostId: report.reportedPostId,
      reportedPostType: report.reportedPostType,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }

  static fromReportList(reports: Report[]): ReportMapper[] {
    return reports.map((report) => this.fromReport(report));
  }

  createdAt: Date;
  id: string;
  reportStatus: ReportStatus;
  reportType: ReportType;
  reportedUser: TrimmedUserMapper;
  reporter: TrimmedUserMapper;
  updatedAt: Date;
}
