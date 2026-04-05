import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import Redis from 'ioredis';
import { Response } from 'express';
import { AuthenticatedRequest } from './request.interface';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(@Inject('REDIS_CLIENT') private redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const apiKeyConfig = request.apiKeyConfig;

    if (!apiKeyConfig) {
      return true;
    }

    const { rateLimit } = apiKeyConfig;
    const key = `rate_limit:${apiKeyConfig.key}`;

    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, rateLimit.windowSeconds);
    }

    const ttl = await this.redis.ttl(key);
    const remaining = Math.max(0, rateLimit.maxRequests - current);

    response.setHeader('X-RateLimit-Limit', rateLimit.maxRequests.toString());
    response.setHeader('X-RateLimit-Remaining', remaining.toString());
    response.setHeader(
      'X-RateLimit-Reset',
      (Date.now() + ttl * 1000).toString(),
    );

    if (current > rateLimit.maxRequests) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
          retryAfter: ttl,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
