import { ApiProperty } from '@nestjs/swagger';

export class SmsResponseDto {
  @ApiProperty({
    description: 'Unique job identifier',
    example: 'sms_1234567890',
  })
  jobId: string;

  @ApiProperty({
    description: 'Current status of the SMS job',
    example: 'queued',
    enum: ['queued', 'active', 'completed', 'failed'],
  })
  status: string;

  @ApiProperty({
    description: 'Position in the queue (0 if already processing)',
    example: 3,
  })
  position: number;

  @ApiProperty({
    description: 'Human-readable status message',
    example: 'SMS zur Warteschlange hinzugefügt',
  })
  message: string;
}
