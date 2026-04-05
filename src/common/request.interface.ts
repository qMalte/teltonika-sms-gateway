import { Request } from 'express';
import { ApiKeyConfig } from '../config/api-keys.config';

export interface AuthenticatedRequest extends Request {
  apiKeyConfig?: ApiKeyConfig;
}
