import {
  Body,
  Controller,
  Get,
  Head,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { CurrentUser } from '../current-user/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthWithRoles } from './auth.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/register')
  register(@Body() user: RegisterDto) {
    return this.authService.register(user);
  }
  @Post('/login')
  @HttpCode(HttpStatus.OK)
  login(@Body() userLoginDto: LoginDto) {
    return this.authService.login(userLoginDto);
  }

  @Get('/verification')
  @HttpCode(HttpStatus.OK)
  verifyUser(@Query('token') token: string) {
    return this.authService.verifyUser(token);
  }

  @Post('/forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Head('/reset-password')
  @HttpCode(HttpStatus.OK)
  headForgotPassword(@Query('token') token: string) {
    return this.authService.headForgotPassword(token);
  }

  @Post('/reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Query('token') token: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(token, resetPasswordDto);
  }

  @Post('/refresh-token')
  @HttpCode(HttpStatus.OK)
  refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.token);
  }

  @AuthWithRoles()
  @Post('/logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() logoutDto: LogoutDto, @CurrentUser() user: User) {
    return this.authService.logout(logoutDto.refreshToken, user);
  }
}
