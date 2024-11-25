import {
  Body,
  Controller,
  Delete,
  Get,
  Head,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthWithRoles } from '../auth/auth.decorator';
import { DoActionOnUsersDto } from './dto/do-action-on-users.dto';
import { DoActionOnReportsDto } from './dto/do-action-on-reports.dto';
import { AddAdminDto } from './dto/add-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

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

  @Get('manage')
  getManagePage(
    @Query('page') page: string,
    @Query('size') size: string,
    @Query('q') q: string,
    @Query('key') key: string,
  ) {
    return this.adminService.getManagePage(+page, +size, q, key);
  }

  @Post('manage')
  doActionOnManagePage(@Body() body: AddAdminDto) {
    return this.adminService.doActionOnManagePage(body);
  }

  @Patch('manage/:id')
  updateAdmin(@Param('id') id: string, @Body() body: UpdateAdminDto) {
    return this.adminService.updateAdmin(id, body);
  }

  @Delete('manage/:id')
  deleteAdmin(@Param('id') id: string, @Query('key') key: string) {
    return this.adminService.deleteAdmin(id, key);
  }

  @Head('manage/key')
  @HttpCode(HttpStatus.OK)
  checkKey(@Query('key') key: string) {
    return this.adminService.checkKey(key);
  }
}
