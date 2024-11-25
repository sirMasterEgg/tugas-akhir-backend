import { applyDecorators, UseGuards } from '@nestjs/common';
import { PunishmentGuard } from './punishment.guard';

export const Punishment = () => applyDecorators(UseGuards(PunishmentGuard));
