import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { VerificationToken } from './entities/verification-token.entity';
import * as bcrypt from 'bcrypt';
import { RefreshToken } from './entities/refresh-token.entity';
import { ForgotPasswordToken } from './entities/forgot-password-token.entity';
import { TrimmedUser } from '../mapper/trimmed-user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let configService: ConfigService;
  let mailerService: MailerService;
  let refreshTokenRepository: Repository<RefreshToken>;
  let verificationTokenRepository: Repository<VerificationToken>;
  let forgotPasswordTokenRepository: Repository<ForgotPasswordToken>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(VerificationToken),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(ForgotPasswordToken),
          useClass: Repository,
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useClass: Repository,
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                save: jest.fn(),
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    mailerService = module.get<MailerService>(MailerService);
    refreshTokenRepository = module.get<Repository<RefreshToken>>(
      getRepositoryToken(RefreshToken),
    );
    verificationTokenRepository = module.get<Repository<VerificationToken>>(
      getRepositoryToken(VerificationToken),
    );
    forgotPasswordTokenRepository = module.get<Repository<ForgotPasswordToken>>(
      getRepositoryToken(ForgotPasswordToken),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a user and send verification email', async () => {
      // Mocking userRepository
      service.existUserByUsernameAndEmail = jest.fn().mockResolvedValue(false);

      configService.get = jest.fn().mockReturnValue('http://localhost:3000');
      // Mocking mailerService
      mailerService.sendMail = jest.fn();

      // Calling the method under test
      const register = await service.register({
        email: 'test@example.com',
        password: 'password',
        birthday: '2000-01-01',
        name: 'Test User',
        username: 'testuser',
      });

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: 'Welcome to Tugas Akhir App! Confirm your Email',
        text: expect.stringContaining('http://localhost:3000/'),
      });
      expect(register.user).toBeDefined();
    });
    it('should throw BadRequestException when username or email already exists', async () => {
      service.existUserByUsernameAndEmail = jest.fn().mockResolvedValue(true);

      await expect(
        service.register({
          username: 'test',
          email: 'test@mail.com',
          password: '123',
          birthday: '11-11-2011',
          name: 'test',
        }),
      ).rejects.toThrow(
        new BadRequestException('Username/Email already exists'),
      );
    });
  });

  describe('login', () => {
    it('should login a user and return tokens', async () => {
      // Mocking userRepository
      const mockUser = new User();
      mockUser.password =
        '$2b$10$1ZSTiI3adkfvdFTY7iP7E.d4I4XsOFzWqQu4yVlpRo9.gdsj90fza'; // hashed password for 'password'
      userRepository.findOne = jest.fn().mockResolvedValue(mockUser);
      refreshTokenRepository.save = jest.fn().mockResolvedValue({
        token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjMwNzZhYmFhLTA0NTgtNDgyNC1hYTU0LWEzM2MyMjRjNDJiNCIsInVzZXJuYW1lIjoidGVzZSIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImJpcnRoZGF5IjoiMjAxMS0xMS0xMSIsIm5hbWUiOiJ5YW50aSIsImlhdCI6MTcxMDE0MTIxMSwiZXhwIjoxNzEwMTQ0ODExfQ.GE0yzp0x7O04ptW-yoCgjSUlNpeZdAvG6EcM91180bI',
      });
      // Mocking compare function
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      // Mocking jwtService
      jwtService.signAsync = jest.fn().mockResolvedValue('accessToken');

      // Calling the method under test
      const result = await service.login({
        username: 'testuser',
        password: 'password',
      });

      expect(result.accessToken).toEqual('accessToken');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).toEqual('accessToken');
    });

    it('should throw UnauthorizedException when username does not exist', async () => {
      // Mocking userRepository
      userRepository.findOne = jest.fn().mockResolvedValue(null);

      // Calling the method under test
      await expect(
        service.login({ username: 'nonexistentuser', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      // Mocking userRepository
      const mockUser = new User();
      mockUser.password =
        '$2b$10$1ZSTiI3adkfvdFTY7iP7E.d4I4XsOFzWqQu4yVlpRo9.gdsj90fza'; // hashed password for 'password'
      userRepository.findOne = jest.fn().mockResolvedValue(mockUser);

      // Mocking compare function
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      // Calling the method under test
      await expect(
        service.login({ username: 'testuser', password: 'incorrectpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyUser', () => {
    it('should verify user and return user data', async () => {
      const token = 'validToken';
      const user: { user: TrimmedUser } = {
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          birthday: new Date(),
          name: 'Test User',
          role: 'user',
          verifiedAt: new Date(),
          vip: false,
          status: null,
          acceptQuestion: true,
          profilePicture: null,
        },
      };
      const result = {
        user: {
          ...user.user,
        },
      };

      userRepository.save = jest.fn().mockResolvedValue(user.user);
      verificationTokenRepository.delete = jest.fn().mockResolvedValue(null);
      refreshTokenRepository.delete = jest.fn().mockResolvedValue(null);
      refreshTokenRepository.save = jest.fn().mockResolvedValue({
        token,
      });
      verificationTokenRepository.findOne = jest.fn().mockResolvedValue(result);

      await expect(service.verifyUser(token)).resolves.toEqual(
        expect.objectContaining({
          user: {
            ...user.user,
            verifiedAt: expect.any(Date), // Use expect.any(Date) to check that verifiedAt is a Date object
          },
        }),
      );

      expect(user.user.verifiedAt).toBeDefined();
      expect(verificationTokenRepository.delete).toHaveBeenCalledWith({
        token,
      });
    });

    it('should throw BadRequestException if token is invalid', async () => {
      const token = 'invalidToken';

      verificationTokenRepository.findOne = jest.fn().mockResolvedValue(null);

      userRepository.save = jest.fn().mockResolvedValue(null);
      verificationTokenRepository.delete = jest.fn().mockResolvedValue(null);

      await expect(service.verifyUser(token)).rejects.toThrow(
        BadRequestException,
      );
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(verificationTokenRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should send mail if has valid mail', async () => {
      userRepository.findOne = jest.fn().mockResolvedValue({
        email: 'yanti@mail.com',
      });
      mailerService.sendMail = jest.fn();
      forgotPasswordTokenRepository.save = jest.fn().mockResolvedValue({
        token: 'validToken',
      });

      await expect(service.forgotPassword('yanti@mail.com')).resolves.toEqual({
        message: 'Email sent!',
      });
      expect(mailerService.sendMail).toHaveBeenCalled();
      expect(forgotPasswordTokenRepository.save).toHaveBeenCalled();
    });
    it('should not send mail if email is invalid', () => {
      userRepository.findOne = jest.fn().mockResolvedValue(null);
      mailerService.sendMail = jest.fn();
      forgotPasswordTokenRepository.save = jest.fn().mockResolvedValue({
        token: 'validToken',
      });

      expect(service.forgotPassword('asd@mail.com')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('headForgotPassword', () => {
    it('should throw BadRequestException if token is invalid', async () => {
      forgotPasswordTokenRepository.findOne = jest.fn().mockResolvedValue(null);
      await expect(service.headForgotPassword('validToken')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resetPassword', () => {
    it('should return message if success', async () => {
      forgotPasswordTokenRepository.findOne = jest.fn().mockResolvedValue({
        token: 'validToken',
        user: {
          id: 1,
          email: 'yanti@mail.com',
          username: 'yanti',
        },
      });
      userRepository.save = jest.fn().mockResolvedValue({
        password: 'hashedPassword',
      });
      forgotPasswordTokenRepository.delete = jest.fn().mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword' as never);
      await expect(
        service.resetPassword('validToken', {
          password: 'password',
        }),
      ).resolves.toEqual({
        message: 'Password has been reset!',
      });
    });
    it('should throw BadRequestException if token invalid', () => {
      forgotPasswordTokenRepository.findOne = jest.fn().mockResolvedValue(null);

      expect(
        service.resetPassword('invalidToken', { password: 'password' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshToken', () => {
    it('should return access token if has valid refresh token', () => {
      const refreshToken = 'valid';
      const verifiedAt = new Date();
      refreshTokenRepository.findOne = jest.fn().mockResolvedValue({
        token: refreshToken,
        user: {
          id: 1,
          username: 'yanti',
          email: 'yanti@mail.com',
          birthday: '2011-11-11',
          name: 'yanti',
          role: 'user',
          verifiedAt: verifiedAt,
          vip: false,
          status: null,
          acceptQuestion: true,
          profilePicture: null,
        },
      });
      jwtService.signAsync = jest.fn().mockResolvedValue('accessToken');
      expect(service.refreshToken(refreshToken)).resolves.toEqual({
        accessToken: 'accessToken',
        user: {
          id: 1,
          username: 'yanti',
          email: 'yanti@mail.com',
          birthday: '2011-11-11',
          name: 'yanti',
          role: 'user',
          verifiedAt: verifiedAt,
          vip: false,
          status: null,
          acceptQuestion: true,
          profilePicture: null,
        },
      });
    });
    it('should throw unauthorized exception if refresh token invalid', () => {
      refreshTokenRepository.findOne = jest.fn().mockResolvedValue(null);
      expect(service.refreshToken('invalidToken')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should delete refresh token if has valid refresh token', () => {
      refreshTokenRepository.findOne = jest.fn().mockResolvedValue({
        token: 'valid token',
      });
      refreshTokenRepository.delete = jest.fn().mockResolvedValue(null);
      const currentUser = new User();
      currentUser.id = '1';

      expect(service.logout('valid token', currentUser)).resolves.toEqual({
        message: 'Logout success',
      });
    });

    it('should throw unauthorized exception if refresh token is invalid', () => {
      refreshTokenRepository.findOne = jest.fn().mockResolvedValue(null);

      expect(service.logout('invalid token', new User())).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
