import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import * as superagent from 'superagent';
import { SmsJobData } from './sms.service';

@Processor('sms')
export class SmsProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(private configService: ConfigService) {
    super();
  }

  async process(job: Job<SmsJobData>): Promise<any> {
    this.logger.log(`Processing SMS job ${job.id} to ${job.data.number}`);

    const routerHost = this.configService.get<string>('router.host');
    const username = this.configService.get<string>('router.username');
    const password = this.configService.get<string>('router.password');

    try {
      const response = await superagent
        .post(`${routerHost}/cgi-bin/sms_send`)
        .type('form')
        .send({
          username,
          password,
          number: job.data.number,
          text: job.data.message,
        })
        .disableTLSCerts()
        .timeout({
          response: 30000,
          deadline: 60000,
        });

      this.logger.log(`SMS job ${job.id} completed successfully`);

      return {
        success: true,
        response: response.text,
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`SMS job ${job.id} failed: ${errorMessage}`);

      throw new Error(`Failed to send SMS: ${errorMessage}`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<SmsJobData>) {
    this.logger.log(`Job ${job.id} completed for number ${job.data.number}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<SmsJobData>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed for number ${job.data.number}: ${error.message}`,
    );
  }
}
