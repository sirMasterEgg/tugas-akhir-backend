import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Repository } from 'typeorm';
import { UserRoleEnum } from '../enums/user-role.enum';
import { hashSync } from 'bcrypt';

@Injectable()
export class SeedService {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async seed(key: string): Promise<{ message: string }> {
    if (key !== this.configService.get<string>('SEED_KEY')) {
      throw new UnauthorizedException('Invalid seed key');
    }
    // Seed data here

    const user = this.userRepository.create({
      name: 'admin',
      username: 'admin',
      email: 'admin@mail.com',
      password: hashSync('admin', 10),
      birthday: new Date(),
      acceptQuestion: false,
      role: UserRoleEnum.ADMIN,
    });

    await this.userRepository.save(user);

    return { message: 'Data seeded' };
  }
}
