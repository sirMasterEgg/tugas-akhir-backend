import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthWithRoles } from '../auth/auth.decorator';
import { DoActionOnUsersDto } from './dto/do-action-on-users.dto';
import { DoActionOnReportsDto } from './dto/do-action-on-reports.dto';

@Controller('admin')
@AuthWithRoles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getAllUsers(
    @Query('page') page: string,
    @Query('size') size: string,
    @Query('filter') filter: string,
    @Query('q') q: string,
  ) {
    return this.adminService.getAllUsers(+page, +size, filter, q);
  }

  @Post('users/actions')
  doActionOnUsers(@Body() body: DoActionOnUsersDto) {
    return this.adminService.doActionOnUsers(body);
  }

  @Get('reports')
  getReports(
    @Query('page') page: string,
    @Query('size') size: string,
    @Query('filter') filter: string,
    @Query('q') q: string,
  ) {
    return this.adminService.getReports(+page, +size, filter, q);
  }

  @Post('reports/actions')
  doActionOnReports(@Body() body: DoActionOnReportsDto) {
    return this.adminService.doActionOnReports(body);
  }

  @Get('reports/preview')
  getReportPreview(@Query('reportId') reportId: string) {
    return this.adminService.getReportPreview(reportId);
  }
}
