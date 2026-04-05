# Teltonika SMS Gateway

NestJS-basierter SMS-Gateway-Microservice fuer Teltonika-Router mit Queue-Management, API-Key-Authentifizierung und Rate-Limiting.

### Sponsor

<a href="https://dilog.page/de" target="_blank">
  <img src="https://dilog.page/assets/images/icons/logo.webp" alt="dilog.page" height="60">
</a>

Dieses Projekt wird unterstuetzt von [DiLog - Das digitale Logbuch](https://dilog.page/de).

## Features

- **SMS-Versand via Queue** - Bull/Redis-basierte Warteschlange mit konfigurierbarer Concurrency
- **API-Key-Authentifizierung** - Mit IP-Beschraenkung (CIDR-Support)
- **Rate-Limiting** - Pro API-Key konfigurierbar
- **Premium-Nummern-Schutz** - Blockiert teure Mehrwertnummern, Kurzwahlen und Ping-Call-Laender
- **Status-Tracking** - Echtzeit-Statusabfrage fuer gesendete SMS
- **Swagger-Dokumentation** - Vollstaendige API-Dokumentation unter `/api`
- **TypeScript SDK** - Typ-sicherer Client fuer einfache Integration

## Architektur

```
Client -> Auth Guard -> Rate Limit -> SMS Controller -> Bull Queue -> SMS Processor -> Teltonika Router
                                                              |
                                                           Redis
```

## Schnellstart

### Voraussetzungen

- Node.js 22+
- Redis
- Docker (optional)

### Installation

```bash
# Dependencies installieren
npm install

# Konfiguration erstellen
cp .env.example .env
cp config/api-keys.yaml.example config/api-keys.yaml

# .env und api-keys.yaml anpassen
```

### Entwicklung

```bash
# Redis starten (Docker)
docker compose -f docker-compose.dev.yml up -d

# Anwendung starten
npm run start:dev

# Swagger UI oeffnen
open http://localhost:3000/api
```

### Produktion (Docker)

```bash
# Konfiguration erstellen
cp .env.example .env
cp config/api-keys.yaml.example config/api-keys.yaml

# Container starten
docker compose up -d
```

## Konfiguration

### Umgebungsvariablen (`.env`)

```env
# Router
ROUTER_HOST=https://192.168.1.1
ROUTER_USERNAME=admin
ROUTER_PASSWORD=secret

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Gateway
PORT=3000
API_KEYS_PATH=./config/api-keys.yaml

# Queue
SMS_QUEUE_CONCURRENCY=1
SMS_QUEUE_DELAY_MS=1000
```

### API-Keys (`config/api-keys.yaml`)

```yaml
apiKeys:
  - key: "sk-your-secret-key"
    name: "Service A"
    allowedIps:
      - "10.0.0.0/8"
      - "192.168.1.100"
    enabled: true
    rateLimit:
      maxRequests: 10
      windowSeconds: 60
```

## API-Endpunkte

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| `POST` | `/sms` | SMS zur Queue hinzufuegen |
| `GET` | `/sms/:jobId/status` | SMS-Status abfragen |
| `GET` | `/sms/queue/status` | Queue-Statistiken |

### SMS senden

```bash
curl -X POST http://localhost:3000/sms \
  -H "X-API-Key: sk-your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"number": "+491761234567", "message": "Hallo Welt!"}'
```

**Response:**
```json
{
  "jobId": "sms_1234567890_abc123",
  "status": "queued",
  "position": 1,
  "message": "SMS zur Warteschlange hinzugefuegt"
}
```

### Status abfragen

```bash
curl http://localhost:3000/sms/sms_1234567890_abc123/status \
  -H "X-API-Key: sk-your-secret-key"
```

**Response:**
```json
{
  "jobId": "sms_1234567890_abc123",
  "status": "completed",
  "number": "+491761234567",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "processedAt": "2024-01-15T10:30:05.000Z",
  "error": null
}
```

## SDK

Ein TypeScript SDK ist unter `sdk/` verfuegbar.

### Installation

```bash
npm install teltonika-sms-gateway-sdk
```

### Verwendung

```typescript
import { SmsGatewayClient } from 'teltonika-sms-gateway-sdk';

const client = new SmsGatewayClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'sk-your-secret-key',
});

// SMS senden
const result = await client.sendSms({
  number: '+491761234567',
  message: 'Hallo!',
});

// Status pruefen
const status = await client.getStatus(result.jobId);

// Oder: Senden und auf Abschluss warten
const final = await client.sendSmsAndWait({
  number: '+491761234567',
  message: 'Hallo!',
});
```

## Sicherheit

### Blockierte Nummern

Das Gateway blockiert automatisch:

- **Premium-Nummern**: 0900, 0137, 0180, 0190 (DE/AT/CH)
- **Kurzwahlnummern**: Alle 4-6 stelligen Nummern
- **Ping-Call-Laender**: Tunesien, Burundi, Komoren, etc.
- **Satelliten-Nummern**: Iridium, Globalstar, Thuraya, Inmarsat
- **Test-Nummern**: Beispielnummern aus der Dokumentation

### Rate-Limiting

- Pro API-Key konfigurierbar
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- HTTP 429 bei Ueberschreitung

### IP-Beschraenkung

- CIDR-Notation unterstuetzt (z.B. `10.0.0.0/8`)
- Einzelne IPs oder Bereiche
- Leere Liste = alle IPs erlaubt

## Entwicklung

```bash
# Lint
npm run lint

# Build
npm run build

# Tests
npm run test

# SDK bauen
cd sdk && npm run build
```

## CI/CD

GitHub Actions Workflows:

- **CI** (`ci.yml`): Lint, Build, Test bei Push/PR
- **Release** (`release.yml`): Docker-Push + SDK-Publish bei Tag
- **Security** (`security.yml`): Dependency Audit, CodeQL, Trivy

### Release erstellen

```bash
git tag v1.0.0
git push --tags
```

## Projektstruktur

```
.
├── src/
│   ├── main.ts                 # Bootstrap mit Swagger
│   ├── app.module.ts           # Root-Modul
│   ├── config/                 # Konfiguration
│   ├── auth/                   # Authentifizierung
│   ├── sms/                    # SMS-Modul
│   │   ├── sms.controller.ts
│   │   ├── sms.service.ts
│   │   ├── sms.processor.ts
│   │   └── dto/
│   └── common/                 # Guards
├── sdk/                        # TypeScript SDK
├── config/
│   └── api-keys.yaml.example
├── .github/workflows/          # CI/CD
├── docker-compose.yml          # Production
├── docker-compose.dev.yml      # Development
├── Dockerfile
└── .env.example
```

## Lizenz

MIT
