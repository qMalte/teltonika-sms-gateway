import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SmsService } from './sms.service';
import { SendSmsDto } from './dto/send-sms.dto';
import { SmsResponseDto } from './dto/sms-response.dto';
import { SmsStatusDto, QueueStatusDto } from './dto/sms-status.dto';
import { RateLimitGuard } from '../common/rate-limit.guard';
import { PremiumNumberGuard } from '../common/premium-number.guard';
import { ApiKeyAuth } from '../auth/api-key.decorator';

@ApiTags('SMS')
@Controller('sms')
@UseGuards(RateLimitGuard)
@ApiKeyAuth()
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post()
  @UseGuards(PremiumNumberGuard)
  @ApiOperation({ summary: 'Send SMS via queue' })
  @ApiResponse({
    status: 201,
    description: 'SMS queued successfully',
    type: SmsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  @ApiResponse({ status: 403, description: 'IP not allowed' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async sendSms(@Body() dto: SendSmsDto): Promise<SmsResponseDto> {
    return this.smsService.queueSms(dto);
  }

  @Get('queue/status')
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics',
    type: QueueStatusDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  async getQueueStatus(): Promise<QueueStatusDto> {
    return this.smsService.getQueueStats();
  }

  @Get(':jobId/status')
  @ApiOperation({ summary: 'Get SMS job status' })
  @ApiResponse({
    status: 200,
    description: 'Job status',
    type: SmsStatusDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getStatus(@Param('jobId') jobId: string): Promise<SmsStatusDto> {
    return this.smsService.getStatus(jobId);
  }
}
