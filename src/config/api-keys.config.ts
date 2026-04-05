export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface ApiKeyConfig {
  key: string;
  name: string;
  allowedIps: string[];
  enabled: boolean;
  rateLimit: RateLimitConfig;
}

export interface ApiKeysConfig {
  apiKeys: ApiKeyConfig[];
}
