import { Body, Controller, Post } from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { AuthWithRoles } from '../auth/auth.decorator';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../user/entities/user.entity';

@Controller('report')
@AuthWithRoles('user')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  create(@Body() createReportDto: CreateReportDto, @CurrentUser() user: User) {
    return this.reportService.create(createReportDto, user);
  }
}
