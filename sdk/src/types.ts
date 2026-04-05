/**
 * SDK Configuration
 */
export interface SmsGatewayConfig {
  /** Base URL of the SMS Gateway (e.g., 'http://localhost:3000') */
  baseUrl: string;
  /** API Key for authentication */
  apiKey: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Retry failed requests (default: false) */
  retry?: boolean;
  /** Number of retry attempts (default: 3) */
  retryAttempts?: number;
}

/**
 * Request to send an SMS
 */
export interface SendSmsRequest {
  /** Phone number in international format (e.g., '+491234567890') */
  number: string;
  /** SMS message content (max 1600 characters) */
  message: string;
}

/**
 * Response after queuing an SMS
 */
export interface SendSmsResponse {
  /** Unique job identifier */
  jobId: string;
  /** Current status of the SMS job */
  status: 'queued' | 'active' | 'completed' | 'failed';
  /** Position in the queue (0 if already processing) */
  position: number;
  /** Human-readable status message */
  message: string;
}

/**
 * SMS job status response
 */
export interface SmsStatusResponse {
  /** Unique job identifier */
  jobId: string;
  /** Current status of the SMS job */
  status: 'queued' | 'active' | 'completed' | 'failed';
  /** Recipient phone number */
  number: string;
  /** Timestamp when the job was created (ISO 8601) */
  createdAt: string;
  /** Timestamp when the job was processed (ISO 8601) */
  processedAt?: string;
  /** Error message if the job failed */
  error?: string | null;
}

/**
 * Queue statistics response
 */
export interface QueueStatusResponse {
  /** Number of waiting jobs */
  waiting: number;
  /** Number of active jobs */
  active: number;
  /** Number of completed jobs */
  completed: number;
  /** Number of failed jobs */
  failed: number;
}

/**
 * API Error response
 */
export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  retryAfter?: number;
}

/**
 * SDK Error class
 */
export class SmsGatewayError extends Error {
  public readonly statusCode: number;
  public readonly response?: ApiErrorResponse;

  constructor(message: string, statusCode: number, response?: ApiErrorResponse) {
    super(message);
    this.name = 'SmsGatewayError';
    this.statusCode = statusCode;
    this.response = response;
  }
}
