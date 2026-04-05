import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { SendSmsDto } from './dto/send-sms.dto';
import { SmsResponseDto } from './dto/sms-response.dto';
import { SmsStatusDto, QueueStatusDto } from './dto/sms-status.dto';

export interface SmsJobData {
  number: string;
  message: string;
  createdAt: string;
}

@Injectable()
export class SmsService {
  constructor(
    @InjectQueue('sms') private smsQueue: Queue<SmsJobData>,
    private configService: ConfigService,
  ) {}

  async queueSms(dto: SendSmsDto): Promise<SmsResponseDto> {
    const jobId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const delayMs = this.configService.get<number>('queue.delayMs') || 1000;

    const waitingCount = await this.smsQueue.getWaitingCount();

    const job = await this.smsQueue.add(
      'send',
      {
        number: dto.number,
        message: dto.message,
        createdAt: new Date().toISOString(),
      },
      {
        jobId,
        delay: waitingCount > 0 ? delayMs * waitingCount : 0,
        removeOnComplete: {
          age: 24 * 60 * 60,
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 60 * 60,
        },
      },
    );

    return {
      jobId: job.id || jobId,
      status: 'queued',
      position: waitingCount + 1,
      message: 'SMS zur Warteschlange hinzugefuegt',
    };
  }

  async getStatus(jobId: string): Promise<SmsStatusDto> {
    const job = await this.smsQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    const statusMap: Record<string, string> = {
      waiting: 'queued',
      delayed: 'queued',
      active: 'active',
      completed: 'completed',
      failed: 'failed',
    };

    return {
      jobId: job.id || jobId,
      status: statusMap[state] || state,
      number: job.data.number,
      createdAt: job.data.createdAt,
      processedAt: job.finishedOn
        ? new Date(job.finishedOn).toISOString()
        : undefined,
      error: job.failedReason || null,
    };
  }

  async getQueueStats(): Promise<QueueStatusDto> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.smsQueue.getWaitingCount(),
      this.smsQueue.getActiveCount(),
      this.smsQueue.getCompletedCount(),
      this.smsQueue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
    };
  }
}
