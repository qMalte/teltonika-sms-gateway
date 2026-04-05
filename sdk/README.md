# Teltonika SMS Gateway SDK

TypeScript SDK for the Teltonika SMS Gateway API.

## Installation

```bash
npm install teltonika-sms-gateway-sdk
```

## Usage

### Basic Example

```typescript
import { SmsGatewayClient } from 'teltonika-sms-gateway-sdk';

const client = new SmsGatewayClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'sk-your-api-key',
});

// Send SMS
const result = await client.sendSms({
  number: '+491234567890',
  message: 'Hello World!',
});

console.log(`SMS queued with ID: ${result.jobId}`);
```

### Check SMS Status

```typescript
const status = await client.getStatus(result.jobId);

console.log(`Status: ${status.status}`);
// 'queued' | 'active' | 'completed' | 'failed'
```

### Send SMS and Wait for Completion

```typescript
const result = await client.sendSmsAndWait(
  {
    number: '+491234567890',
    message: 'Hello World!',
  },
  {
    timeout: 60000, // Max wait time in ms
    pollInterval: 2000, // Check every 2 seconds
  },
);

if (result.status === 'completed') {
  console.log('SMS sent successfully!');
} else {
  console.error('SMS failed:', result.error);
}
```

### Queue Statistics

```typescript
const stats = await client.getQueueStatus();

console.log(`Waiting: ${stats.waiting}`);
console.log(`Active: ${stats.active}`);
console.log(`Completed: ${stats.completed}`);
console.log(`Failed: ${stats.failed}`);
```

## Configuration

```typescript
const client = new SmsGatewayClient({
  // Required
  baseUrl: 'http://localhost:3000',
  apiKey: 'sk-your-api-key',

  // Optional
  timeout: 30000, // Request timeout (default: 30000ms)
  retry: true, // Retry on 5xx and 429 errors (default: false)
  retryAttempts: 3, // Number of retry attempts (default: 3)
});
```

## Error Handling

```typescript
import { SmsGatewayClient, SmsGatewayError } from 'teltonika-sms-gateway-sdk';

try {
  await client.sendSms({ number: '+49...', message: 'Test' });
} catch (error) {
  if (error instanceof SmsGatewayError) {
    console.error(`API Error: ${error.message}`);
    console.error(`Status Code: ${error.statusCode}`);

    if (error.statusCode === 429) {
      console.error(`Rate limited. Retry after: ${error.response?.retryAfter}s`);
    }
  }
}
```

## API Reference

### `SmsGatewayClient`

#### Methods

| Method | Description |
|--------|-------------|
| `sendSms(request)` | Queue an SMS for sending |
| `getStatus(jobId)` | Get status of an SMS job |
| `getQueueStatus()` | Get queue statistics |
| `waitForCompletion(jobId, options?)` | Wait for job to complete |
| `sendSmsAndWait(request, options?)` | Send SMS and wait for completion |

### Types

```typescript
interface SendSmsRequest {
  number: string; // Phone number (international format)
  message: string; // Message content (max 1600 chars)
}

interface SendSmsResponse {
  jobId: string;
  status: 'queued' | 'active' | 'completed' | 'failed';
  position: number;
  message: string;
}

interface SmsStatusResponse {
  jobId: string;
  status: 'queued' | 'active' | 'completed' | 'failed';
  number: string;
  createdAt: string;
  processedAt?: string;
  error?: string | null;
}

interface QueueStatusResponse {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}
```

## License

MIT
