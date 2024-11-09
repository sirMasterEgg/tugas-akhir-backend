import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Group } from '../group/entities/group.entity';
import { ElasticsearchModule } from '@nestjs/elasticsearch';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Group]),
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        node: `${configService.get<string>('ELASTICSEARCH_PROTOCOL')}://${configService.get<string>('ELASTICSEARCH_HOST')}:${configService.get<string>('ELASTICSEARCH_PORT')}`,
      }),
    }),
  ],
  controllers: [SearchController],
  providers: [SearchService, JwtService, ConfigService],
})
export class SearchModule {}
