import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

export const AUTH_KEY: string = 'AUTH_METADATA_KEY';

export const Auth = (...roles: string[]) => SetMetadata(AUTH_KEY, roles);

export const AuthWithRoles = (...roles: string[]) => {
  return applyDecorators(Auth(...roles), UseGuards(AuthGuard));
};
