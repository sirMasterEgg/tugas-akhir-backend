import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../user/entities/user.entity';
import { compare, hash } from 'bcrypt';
import { RegisterResponseDto } from './dto/register-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { randomBytes } from 'crypto';
import { UserRoleEnum } from '../enums/user-role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThanOrEqual, Repository } from 'typeorm';
import { VerificationToken } from './entities/verification-token.entity';
import * as moment from 'moment';
import { RefreshToken } from './entities/refresh-token.entity';
import { ForgotPasswordToken } from './entities/forgot-password-token.entity';
import { ForgotPasswordResponseDto } from './dto/forgot-password-response.dto';
import { RefreshTokenResponseDto } from './dto/refresh-token-response.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResetPasswordResponseDto } from './dto/reset-password-response.dto';
import { TrimmedUser, TrimmedUserMapper } from '../mapper/trimmed-user.entity';
import { UserPunishmentStatusEnum } from '../admin/entities/user-status.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(VerificationToken)
    private verificationTokenRepository: Repository<VerificationToken>,
    @InjectRepository(ForgotPasswordToken)
    private forgotPasswordTokenRepository: Repository<ForgotPasswordToken>,
    private datasource: DataSource,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}
  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    if (
      await this.existUserByUsernameAndEmail(
        registerDto.username,
        registerDto.email,
      )
    ) {
      throw new BadRequestException('Username/Email already exists');
    }

    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const user = new User();
      user.email = registerDto.email;
      user.password = await hash(registerDto.password, 10);
      user.birthday = moment(registerDto.birthday, 'DD-MM-YYYY').toDate();
      user.name = registerDto.name;
      user.username = registerDto.username;
      user.role = UserRoleEnum.USER;
      await queryRunner.manager.save(user);

      const verificationToken = randomBytes(64).toString('hex');
      const verificationEntity = new VerificationToken();
      verificationEntity.token = verificationToken;
      verificationEntity.user = user;
      await queryRunner.manager.save(verificationEntity);

      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Welcome to Tugas Akhir App! Confirm your Email',
        text: `Hello ${user.name}, welcome to Tugas Akhir App! To proceed please confirm your email by clicking this link: ${this.configService.get<string>('APP_URL')}/verify?token=${verificationToken}`,
      });

      await queryRunner.commitTransaction();
      return {
        user: TrimmedUserMapper.fromUser(user),
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Error while writing to database');
    } finally {
      await queryRunner.release();
    }
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.userRepository.findOne({
      where: { username: loginDto.username },
    });
    if (!user) {
      throw new UnauthorizedException('Login failed');
    }

    if (!(await compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Login failed');
    }

    if (user?.status?.userStatus === UserPunishmentStatusEnum.BANNED) {
      throw new UnauthorizedException('User is banned');
    }

    const [accessToken, refreshToken] = await this.assignToken(user);

    const refreshTokenModel = new RefreshToken();
    refreshTokenModel.token = refreshToken;
    refreshTokenModel.user = user;

    try {
      await this.refreshTokenRepository.save(refreshTokenModel);
    } catch (e) {
      console.log(e);
    }

    return {
      user: TrimmedUserMapper.fromUser(user),
      accessToken,
      refreshToken,
    };
  }

  public async verifyUser(token: string) {
    const user = await this.verificationTokenRepository.findOne({
      where: { token },
      relations: ['user'],
      loadEagerRelations: true,
    });
    if (!user) {
      throw new BadRequestException('Invalid token');
    }

    user.user.verifiedAt = new Date();
    await this.userRepository.save(user.user);
    await this.verificationTokenRepository.delete({ token });
    const [accessToken, refreshToken] = await this.assignToken(user.user);
    await this.refreshTokenRepository.delete({ user: user.user });
    const refreshTokenModel = new RefreshToken();
    refreshTokenModel.token = refreshToken;
    refreshTokenModel.user = user.user;
    await this.refreshTokenRepository.save(refreshTokenModel);

    return {
      user: TrimmedUserMapper.fromUser(user.user),
      accessToken,
      refreshToken,
    };
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponseDto> {
    const user = await this.userRepository.findOne({
      where: { email },
    });
    if (!user) {
      throw new BadRequestException('Email not found');
    }

    const token = randomBytes(64).toString('hex');
    const forgotPasswordEntity = new ForgotPasswordToken();
    forgotPasswordEntity.token = token;
    forgotPasswordEntity.user = user;

    await Promise.all([
      this.forgotPasswordTokenRepository.save(forgotPasswordEntity),
      this.mailerService.sendMail({
        to: user.email,
        subject: 'Reset Password',
        text: `Hello ${user.name}! To reset the password please click this link: ${this.configService.get<string>('APP_URL')}/reset-password?token=${token}`,
      }),
    ]);

    return {
      message: 'Email sent!',
    };
  }

  async headForgotPassword(token: string) {
    const forgotPasswordToken =
      await this.forgotPasswordTokenRepository.findOne({
        where: {
          token,
          expiresAt: MoreThanOrEqual(new Date()),
        },
      });
    if (!forgotPasswordToken) {
      throw new BadRequestException('Invalid token');
    }
  }

  async refreshToken(token: string): Promise<RefreshTokenResponseDto> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token },
      relations: ['user'],
      loadEagerRelations: true,
    });
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid token');
    }

    if (
      refreshToken?.user?.status?.userStatus === UserPunishmentStatusEnum.BANNED
    ) {
      throw new UnauthorizedException('User is banned');
    }

    const accessToken = await this.jwtService.signAsync(
      TrimmedUserMapper.fromUser(refreshToken.user),
      {
        secret: this.configService.get<string>('ACCESS_TOKEN_KEY'),
        expiresIn: this.configService.get<string>('ACCESS_TOKEN_EXPIRE'),
      },
    );

    return {
      user: TrimmedUserMapper.fromUser(refreshToken.user),
      accessToken,
    };
  }

  async logout(token: string, currentUser: User): Promise<LogoutResponseDto> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: {
        token,
        user: {
          id: currentUser.id,
        },
      },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid token');
    }

    await this.refreshTokenRepository.delete({ token });

    return { message: 'Logout success' };
  }

  public existUserByUsernameAndEmail(
    username: string,
    email: string,
  ): Promise<User> {
    return this.userRepository.findOne({ where: [{ username }, { email }] });
  }

  public assignToken(user: User) {
    const payload: TrimmedUser = TrimmedUserMapper.fromUser(user);

    return Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('ACCESS_TOKEN_KEY'),
        expiresIn: this.configService.get<string>('ACCESS_TOKEN_EXPIRE'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('REFRESH_TOKEN_KEY'),
        expiresIn: this.configService.get<string>('REFRESH_TOKEN_EXPIRE'),
      }),
    ]);
  }

  async resetPassword(
    token: string,
    resetPasswordDto: ResetPasswordDto,
  ): Promise<ResetPasswordResponseDto> {
    const forgotPasswordToken =
      await this.forgotPasswordTokenRepository.findOne({
        where: {
          token,
          expiresAt: MoreThanOrEqual(new Date()),
        },
        relations: ['user'],
        loadEagerRelations: true,
      });

    if (!forgotPasswordToken) {
      throw new BadRequestException('Invalid token');
    }

    forgotPasswordToken.user.password = await hash(
      resetPasswordDto.password,
      10,
    );

    await Promise.all([
      this.userRepository.save(forgotPasswordToken.user),
      this.forgotPasswordTokenRepository.delete({ token }),
    ]);

    return { message: 'Password has been reset!' };
  }
}
