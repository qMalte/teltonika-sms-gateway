import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';

export class SendSmsDto {
  @ApiProperty({
    description: 'Phone number in international format',
    example: '+491234567890',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'Phone number must be in valid international format',
  })
  number: string;

  @ApiProperty({
    description: 'SMS message content',
    example: 'Hello World!',
    maxLength: 1600,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1600, { message: 'Message cannot exceed 1600 characters' })
  message: string;
}
