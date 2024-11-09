import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Response } from 'express';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const ctxType = ctx.getType();
    if (ctxType === 'http') {
      const response: Response = ctx.switchToHttp().getResponse();
      return response.locals.user;
    } else if (ctxType === 'ws') {
      const client = ctx.switchToWs().getClient();
      return client.data.user;
    }
  },
);
