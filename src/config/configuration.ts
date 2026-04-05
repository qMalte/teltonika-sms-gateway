import { readFileSync, existsSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';
import { ApiKeysConfig } from './api-keys.config';

export interface AppConfig {
  port: number;
  router: {
    host: string;
    username: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  queue: {
    concurrency: number;
    delayMs: number;
  };
  apiKeys: ApiKeysConfig;
}

export default (): AppConfig => {
  const apiKeysPath =
    process.env.API_KEYS_PATH || join(process.cwd(), 'config', 'api-keys.yaml');

  let apiKeysConfig: ApiKeysConfig = { apiKeys: [] };

  if (existsSync(apiKeysPath)) {
    const fileContents = readFileSync(apiKeysPath, 'utf8');
    apiKeysConfig = yaml.load(fileContents) as ApiKeysConfig;
  } else {
    console.warn(
      `API keys configuration file not found at ${apiKeysPath}. No API keys configured.`,
    );
  }

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    router: {
      host: process.env.ROUTER_HOST || 'https://192.168.1.1',
      username: process.env.ROUTER_USERNAME || 'admin',
      password: process.env.ROUTER_PASSWORD || '',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    },
    queue: {
      concurrency: parseInt(process.env.SMS_QUEUE_CONCURRENCY || '1', 10),
      delayMs: parseInt(process.env.SMS_QUEUE_DELAY_MS || '1000', 10),
    },
    apiKeys: apiKeysConfig,
  };
};
