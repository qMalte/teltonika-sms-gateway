import { applyDecorators } from '@nestjs/common';
import {
  ApiSecurity,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

export function ApiKeyAuth() {
  return applyDecorators(
    ApiSecurity('X-API-Key'),
    ApiUnauthorizedResponse({ description: 'Invalid or missing API key' }),
    ApiForbiddenResponse({ description: 'IP address not allowed for this API key' }),
  );
}
