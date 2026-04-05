import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyConfig, ApiKeysConfig } from '../config/api-keys.config';
import { AuthenticatedRequest } from '../common/request.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('Missing API key');
    }

    const apiKeysConfig = this.configService.get<ApiKeysConfig>('apiKeys') || {
      apiKeys: [],
    };
    const keyConfig = apiKeysConfig.apiKeys.find(
      (k: ApiKeyConfig) => k.key === apiKey && k.enabled,
    );

    if (!keyConfig) {
      throw new UnauthorizedException('Invalid API key');
    }

    const clientIp = this.getClientIp(request);

    if (
      keyConfig.allowedIps.length > 0 &&
      !this.isIpAllowed(clientIp, keyConfig.allowedIps)
    ) {
      throw new ForbiddenException(
        `IP address ${clientIp} not allowed for this API key`,
      );
    }

    request.apiKeyConfig = keyConfig;

    return true;
  }

  private getClientIp(request: AuthenticatedRequest): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const firstIp = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return firstIp?.trim() ?? '127.0.0.1';
    }
    return request.ip ?? request.socket?.remoteAddress ?? '127.0.0.1';
  }

  private isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
    const normalizedClientIp = this.normalizeIp(clientIp);

    for (const allowed of allowedIps) {
      if (allowed.includes('/')) {
        if (this.isIpInCidr(normalizedClientIp, allowed)) {
          return true;
        }
      } else {
        if (normalizedClientIp === this.normalizeIp(allowed)) {
          return true;
        }
      }
    }

    return false;
  }

  private normalizeIp(ip: string): string {
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    return ip;
  }

  private isIpInCidr(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = parseInt(bits, 10);

    if (ip.includes(':') || range.includes(':')) {
      return false;
    }

    const ipNum = this.ipToNumber(ip);
    const rangeNum = this.ipToNumber(range);
    const maskNum = ~(2 ** (32 - mask) - 1);

    return (ipNum & maskNum) === (rangeNum & maskNum);
  }

  private ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
  }
}
