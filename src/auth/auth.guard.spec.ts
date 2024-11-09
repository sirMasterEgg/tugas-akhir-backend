import { AuthGuard } from './auth.guard';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Socket } from 'socket.io';
import {
  ExecutionContext,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import { WsException } from '@nestjs/websockets';
import { Request } from 'express';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: JwtService;
  let configService: ConfigService;
  let reflector: Reflector;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
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
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('WS request', () => {
    const mockSocket: DeepPartial<Socket> = {
      handshake: {
        headers: {
          authorization: 'Bearer valid-token',
        },
      },
      data: {},
    };

    const mockExecutionContext = {
      getType: jest.fn().mockReturnValue('ws'),
      switchToWs: jest.fn().mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockSocket),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    it('should allow access with a valid token and matching role', () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue(['user']);
      jwtService.verify = jest.fn().mockReturnValue({ role: 'user' });

      expect(guard.canActivate(mockExecutionContext)).toBe(true);
      expect(mockSocket.data.user).toEqual({ role: 'user' });
    });

    it('should deny access with an invalid token', () => {
      mockSocket.handshake.headers.authorization = 'Bearer invalid-token';
      jwtService.verify = jest.fn().mockImplementation(() => {
        throw new WsException('Invalid token');
      });

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        WsException,
      );
    });

    it('should deny access when no token is provided', () => {
      mockSocket.handshake.headers.authorization = '';

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        WsException,
      );
    });
  });

  describe('HTTP requests', () => {
    const mockRequest: DeepPartial<Request> = {
      headers: {
        authorization: 'Bearer valid',
      },
    };

    const mockExecutionContext = {
      getType: jest.fn().mockReturnValue('http'),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue({ locals: {} }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    it('should allow access with a valid token and matching role', () => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue(['admin']);
      jwtService.verify = jest.fn().mockReturnValue({ role: 'admin' });

      expect(guard.canActivate(mockExecutionContext)).toBe(true);
    });

    it('should deny access with an invalid token', () => {
      mockRequest.headers.authorization = 'Bearer invalid-token';
      jwtService.verify = jest.fn().mockImplementation(() => {
        throw new UnauthorizedException('Invalid token');
      });

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        HttpException,
      );
    });

    it('should deny access when no token is provided', () => {
      mockRequest.headers.authorization = '';

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        HttpException,
      );
    });
  });
});
