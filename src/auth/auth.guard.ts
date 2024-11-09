import {
  CanActivate,
  ContextType,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Request, Response } from 'express';
import { Reflector } from '@nestjs/core';
import { AUTH_KEY } from './auth.decorator';
import { TrimmedUser } from '../mapper/trimmed-user.entity';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const roles = this.reflector.getAllAndOverride<string[]>(AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requestType: ContextType = context.getType();

    if (requestType === 'ws') {
      const wsContext = context.switchToWs();
      const client = wsContext.getClient<Socket>();
      const authorization =
        client.handshake.headers.authorization ??
        (client.handshake.headers.Authorization as string);

      if (!authorization) {
        throw new WsException('Unauthorized.');
      }

      try {
        const token: string = authorization.split(' ')[1];

        const payload = this.jwtService.verify<TrimmedUser>(token, {
          secret: this.configService.get<string>('ACCESS_TOKEN_KEY'),
        });

        client.data.user = payload;

        return !roles || !roles.length || roles.includes(payload.role);
      } catch (err) {
        throw new WsException('Invalid token.');
      }
    } else if (requestType === 'http') {
      const httpContext = context.switchToHttp();
      const req = httpContext.getRequest<Request>();
      const res = httpContext.getResponse<Response>();

      const authorization =
        req.headers.authorization ?? (req.headers.Authorization as string);

      if (!authorization) {
        throw new HttpException('Unauthorized.', HttpStatus.UNAUTHORIZED);
      }

      const token: string = authorization.split(' ')[1];

      try {
        const payload = this.jwtService.verify<TrimmedUser>(token, {
          secret: this.configService.get<string>('ACCESS_TOKEN_KEY'),
        });
        res.locals.user = payload;

        return !roles || !roles.length || roles.includes(payload.role);
      } catch (err) {
        throw new HttpException('Invalid token.', HttpStatus.UNAUTHORIZED);
      }
    } else {
      return false;
    }
  }
}
