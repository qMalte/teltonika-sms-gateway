import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SmsStatusDto {
  @ApiProperty({
    description: 'Unique job identifier',
    example: 'sms_1234567890',
  })
  jobId: string;

  @ApiProperty({
    description: 'Current status of the SMS job',
    example: 'completed',
    enum: ['queued', 'active', 'completed', 'failed'],
  })
  status: string;

  @ApiProperty({
    description: 'Recipient phone number',
    example: '+491234567890',
  })
  number: string;

  @ApiProperty({
    description: 'Timestamp when the job was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Timestamp when the job was processed',
    example: '2024-01-15T10:30:05.000Z',
  })
  processedAt?: string;

  @ApiPropertyOptional({
    description: 'Error message if the job failed',
    example: null,
  })
  error?: string | null;
}

export class QueueStatusDto {
  @ApiProperty({
    description: 'Number of waiting jobs',
    example: 5,
  })
  waiting: number;

  @ApiProperty({
    description: 'Number of active jobs',
    example: 1,
  })
  active: number;

  @ApiProperty({
    description: 'Number of completed jobs',
    example: 150,
  })
  completed: number;

  @ApiProperty({
    description: 'Number of failed jobs',
    example: 2,
  })
  failed: number;
}
