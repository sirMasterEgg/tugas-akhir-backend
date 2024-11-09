import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { VerificationToken } from './entities/verification-token.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { ForgotPasswordToken } from './entities/forgot-password-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      VerificationToken,
      RefreshToken,
      ForgotPasswordToken,
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtService],
})
export class AuthModule {}
