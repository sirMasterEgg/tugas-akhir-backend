import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupModule } from './group/group.module';
import { UserModule } from './user/user.module';
import { FileService } from './file/file.service';
import { QuestionReplyModule } from './question-reply/question-reply.module';
import { PostWsModule } from './post-ws/post-ws.module';
import { SearchModule } from './search/search.module';
import { SeedModule } from './seed/seed.module';
import { InboxModule } from './inbox/inbox.module';
import { VoteModule } from './vote/vote.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationObserverModule } from './notification-observer/notification-observer.module';
import { ReportModule } from './report/report.module';
import { AdminModule } from './admin/admin.module';
import { VipModule } from './vip/vip.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DATABASE_HOST'),
        port: +configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USERNAME'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        autoLoadEntities: true,
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('MAILGUN_SMTP_SERVER'),
          port: +configService.get<number>('MAILGUN_SMTP_PORT'),
          secure: false,
          auth: {
            user: configService.get<string>('MAILGUN_SMTP_USERNAME'),
            pass: configService.get<string>('MAILGUN_SMTP_PASSWORD'),
          },
        },
        defaults: {
          from: `"No Reply" <tugas@akhir.com>`,
        },
      }),
    }),
    EventEmitterModule.forRoot(),
    UserModule,
    AuthModule,
    GroupModule,
    QuestionReplyModule,
    PostWsModule,
    SearchModule,
    SeedModule,
    InboxModule,
    VoteModule,
    NotificationObserverModule,
    ReportModule,
    AdminModule,
    VipModule,
  ],
  controllers: [],
  providers: [FileService],
})
export class AppModule {}
