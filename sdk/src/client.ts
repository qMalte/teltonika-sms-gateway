import superagent from 'superagent';
import {
  SmsGatewayConfig,
  SendSmsRequest,
  SendSmsResponse,
  SmsStatusResponse,
  QueueStatusResponse,
  SmsGatewayError,
  ApiErrorResponse,
} from './types';

/**
 * Teltonika SMS Gateway SDK Client
 *
 * @example
 * ```typescript
 * const client = new SmsGatewayClient({
 *   baseUrl: 'http://localhost:3000',
 *   apiKey: 'sk-your-api-key',
 * });
 *
 * // Send SMS
 * const result = await client.sendSms({
 *   number: '+491234567890',
 *   message: 'Hello World!',
 * });
 *
 * // Check status
 * const status = await client.getStatus(result.jobId);
 * ```
 */
export class SmsGatewayClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly retry: boolean;
  private readonly retryAttempts: number;

  constructor(config: SmsGatewayConfig) {
    if (!config.baseUrl) {
      throw new Error('baseUrl is required');
    }
    if (!config.apiKey) {
      throw new Error('apiKey is required');
    }

    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000;
    this.retry = config.retry ?? false;
    this.retryAttempts = config.retryAttempts ?? 3;
  }

  /**
   * Send an SMS message
   *
   * @param request - SMS request containing number and message
   * @returns Promise with the queued SMS response
   * @throws SmsGatewayError on API errors
   *
   * @example
   * ```typescript
   * const result = await client.sendSms({
   *   number: '+491234567890',
   *   message: 'Hello World!',
   * });
   * console.log(`SMS queued with ID: ${result.jobId}`);
   * ```
   */
  async sendSms(request: SendSmsRequest): Promise<SendSmsResponse> {
    return this.request<SendSmsResponse>('POST', '/sms', request);
  }

  /**
   * Get the status of an SMS job
   *
   * @param jobId - The job ID returned from sendSms
   * @returns Promise with the SMS status
   * @throws SmsGatewayError on API errors (404 if job not found)
   *
   * @example
   * ```typescript
   * const status = await client.getStatus('sms_1234567890');
   * if (status.status === 'completed') {
   *   console.log('SMS sent successfully!');
   * }
   * ```
   */
  async getStatus(jobId: string): Promise<SmsStatusResponse> {
    return this.request<SmsStatusResponse>('GET', `/sms/${jobId}/status`);
  }

  /**
   * Get queue statistics
   *
   * @returns Promise with queue statistics
   * @throws SmsGatewayError on API errors
   *
   * @example
   * ```typescript
   * const stats = await client.getQueueStatus();
   * console.log(`Waiting: ${stats.waiting}, Active: ${stats.active}`);
   * ```
   */
  async getQueueStatus(): Promise<QueueStatusResponse> {
    return this.request<QueueStatusResponse>('GET', '/sms/queue/status');
  }

  /**
   * Wait for an SMS job to complete
   *
   * @param jobId - The job ID to wait for
   * @param options - Polling options
   * @returns Promise with the final SMS status
   * @throws SmsGatewayError on API errors or timeout
   *
   * @example
   * ```typescript
   * const result = await client.sendSms({ number: '+49...', message: 'Test' });
   * const final = await client.waitForCompletion(result.jobId, {
   *   timeout: 60000,
   *   pollInterval: 2000,
   * });
   * ```
   */
  async waitForCompletion(
    jobId: string,
    options: { timeout?: number; pollInterval?: number } = {},
  ): Promise<SmsStatusResponse> {
    const timeout = options.timeout ?? 60000;
    const pollInterval = options.pollInterval ?? 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const status = await this.getStatus(jobId);

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      await this.sleep(pollInterval);
    }

    throw new SmsGatewayError(
      `Timeout waiting for job ${jobId} to complete`,
      408,
    );
  }

  /**
   * Send SMS and wait for completion
   *
   * @param request - SMS request containing number and message
   * @param options - Polling options
   * @returns Promise with the final SMS status
   *
   * @example
   * ```typescript
   * const result = await client.sendSmsAndWait({
   *   number: '+491234567890',
   *   message: 'Hello!',
   * });
   * if (result.status === 'completed') {
   *   console.log('SMS delivered!');
   * }
   * ```
   */
  async sendSmsAndWait(
    request: SendSmsRequest,
    options: { timeout?: number; pollInterval?: number } = {},
  ): Promise<SmsStatusResponse> {
    const response = await this.sendSms(request);
    return this.waitForCompletion(response.jobId, options);
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: object,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let attempts = 0;
    const maxAttempts = this.retry ? this.retryAttempts : 1;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        let req = superagent(method, url)
          .set('X-API-Key', this.apiKey)
          .set('Content-Type', 'application/json')
          .timeout(this.timeout);

        if (body && method === 'POST') {
          req = req.send(body);
        }

        const response = await req;
        return response.body as T;
      } catch (error: unknown) {
        const shouldRetry =
          this.retry &&
          attempts < maxAttempts &&
          this.isRetryableError(error);

        if (!shouldRetry) {
          throw this.handleError(error);
        }

        await this.sleep(Math.pow(2, attempts) * 1000);
      }
    }

    throw new SmsGatewayError('Max retry attempts reached', 500);
  }

  private isRetryableError(error: unknown): boolean {
    if (this.isSuperagentError(error)) {
      const status = error.status ?? 0;
      return status === 429 || status >= 500;
    }
    return false;
  }

  private isSuperagentError(
    error: unknown,
  ): error is superagent.ResponseError & { response?: superagent.Response } {
    return (
      error !== null &&
      typeof error === 'object' &&
      'status' in error &&
      typeof (error as { status: unknown }).status === 'number'
    );
  }

  private handleError(error: unknown): SmsGatewayError {
    if (this.isSuperagentError(error)) {
      const status = error.status || 500;
      const body = error.response?.body as ApiErrorResponse | undefined;
      const message = body?.message || error.message || 'Unknown error';
      return new SmsGatewayError(message, status, body);
    }

    if (error instanceof Error) {
      return new SmsGatewayError(error.message, 500);
    }

    return new SmsGatewayError('Unknown error', 500);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
