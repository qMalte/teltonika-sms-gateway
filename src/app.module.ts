import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { SmsModule } from './sms/sms.module';

@Module({
  imports: [ConfigModule, AuthModule, SmsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
