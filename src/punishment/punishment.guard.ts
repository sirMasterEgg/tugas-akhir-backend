import {
  CanActivate,
  ContextType,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Socket } from 'socket.io';
import { TrimmedUser } from '../mapper/trimmed-user.entity';
import { Response } from 'express';
import { UserPunishmentStatusEnum } from '../admin/entities/user-status.entity';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class PunishmentGuard implements CanActivate {
  checkPunishmentStatus(user: TrimmedUser, type: ContextType) {
    if (type === 'ws') {
      if (user?.status?.userStatus === UserPunishmentStatusEnum.BANNED) {
        throw new WsException('You are banned.');
      }
      if (
        user?.status?.userStatus === UserPunishmentStatusEnum.TIMEOUT &&
        user?.status?.expired >= new Date()
      ) {
        throw new WsException('You are timed out.');
      }
    } else if (type === 'http') {
      if (user?.status?.userStatus === UserPunishmentStatusEnum.BANNED) {
        throw new UnauthorizedException('You are banned.');
      }
      if (
        user?.status?.userStatus === UserPunishmentStatusEnum.TIMEOUT &&
        user?.status?.expired >= new Date()
      ) {
        throw new ForbiddenException('You are timed out.');
      }
    }
    return true;
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requestType: ContextType = context.getType();

    if (requestType === 'ws') {
      const wsContext = context.switchToWs();
      const client = wsContext.getClient<Socket>();
      return this.checkPunishmentStatus(client.data.user, requestType);
    } else if (requestType === 'http') {
      const httpContext = context.switchToHttp();
      const res = httpContext.getResponse<Response>();
      return this.checkPunishmentStatus(res.locals.user, requestType);
    } else {
      return false;
    }
  }
}
