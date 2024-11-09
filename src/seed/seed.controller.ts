import { Controller, Get, Query } from '@nestjs/common';
import { SeedService } from './seed.service';

@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get()
  seed(@Query('key') key: string) {
    return this.seedService.seed(key);
  }
}
