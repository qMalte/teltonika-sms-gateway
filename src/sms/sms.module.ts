import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { SmsProcessor } from './sms.processor';
import { RateLimitGuard } from '../common/rate-limit.guard';
import Redis from 'ioredis';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: 'sms',
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password') || undefined,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [SmsController],
  providers: [
    SmsService,
    SmsProcessor,
    RateLimitGuard,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password') || undefined,
        });
      },
      inject: [ConfigService],
    },
  ],
})
export class SmsModule {}
