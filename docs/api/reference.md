# API Reference

## Authentication

LinkFlare uses two types of authentication:

| Type | Header | Used For |
|------|--------|---------|
| **Admin Secret** | `X-Admin-Secret: <your-admin-secret>` | Platform management: tenants, credentials, configs |
| **Tenant API Key** | `X-Api-Key: <tenant-api-key>` | Sending messages (hub-api-proxy) |

All requests must use HTTPS. Include the appropriate header based on the endpoint.

---

## Tenants

### Create Tenant

**`POST /api/tenants`** — Admin

Creates a new tenant on the platform.

**Request:**
```http
POST /api/tenants
Content-Type: application/json
X-Admin-Secret: <your-admin-secret>

{
  "name": "Acme Corp"
}
```

**Response `201`:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Acme Corp",
  "apiKey": "lf_sk_abc123xyz...",
  "status": "ACTIVE",
  "createdAt": "2026-04-20T09:00:00Z"
}
```

---

### List Tenants

**`GET /api/tenants`** — Admin

Returns all tenants.

**Request:**
```http
GET /api/tenants
X-Admin-Secret: <your-admin-secret>
```

**Response `200`:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corp",
    "status": "ACTIVE",
    "createdAt": "2026-04-20T09:00:00Z"
  }
]
```

---

### Get Tenant

**`GET /api/tenants/{id}`** — Admin

**Request:**
```http
GET /api/tenants/550e8400-e29b-41d4-a716-446655440000
X-Admin-Secret: <your-admin-secret>
```

**Response `200`:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Acme Corp",
  "status": "ACTIVE",
  "createdAt": "2026-04-20T09:00:00Z",
  "updatedAt": "2026-04-20T09:00:00Z"
}
```

---

### Update Tenant

**`PUT /api/tenants/{id}`** — Admin

**Request:**
```http
PUT /api/tenants/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
X-Admin-Secret: <your-admin-secret>

{
  "name": "Acme Corporation",
  "status": "ACTIVE"
}
```

**Response `200`:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Acme Corporation",
  "status": "ACTIVE",
  "updatedAt": "2026-04-20T10:00:00Z"
}
```

---

### Delete Tenant

**`DELETE /api/tenants/{id}`** — Admin

Permanently deletes a tenant and all associated resources.

**Request:**
```http
DELETE /api/tenants/550e8400-e29b-41d4-a716-446655440000
X-Admin-Secret: <your-admin-secret>
```

**Response `204`:** (no body)

---

## Credentials

### Create Credential

**`POST /api/tenants/{tenantId}/credentials`** — Admin

Adds a channel credential for the tenant. The `accessToken` and `appSecret` are encrypted before storage.

**Request:**
```http
POST /api/tenants/550e8400-e29b-41d4-a716-446655440000/credentials
Content-Type: application/json
X-Admin-Secret: <your-admin-secret>

{
  "channel": "MESSENGER",
  "pageId": "123456789",
  "accessToken": "EAAxxxxx...",
  "appId": "987654321",
  "appSecret": "abc123def456..."
}
```

**`channel` values:** `MESSENGER`, `WHATSAPP`, `INSTAGRAM`

**Response `201`:**
```json
{
  "id": 1,
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "channel": "MESSENGER",
  "pageId": "123456789",
  "appId": "987654321",
  "createdAt": "2026-04-20T09:01:00Z"
}
```

> The `accessToken` and `appSecret` are never returned in responses.

---

### List Credentials

**`GET /api/tenants/{tenantId}/credentials`** — Admin

**Request:**
```http
GET /api/tenants/550e8400-e29b-41d4-a716-446655440000/credentials
X-Admin-Secret: <your-admin-secret>
```

**Response `200`:**
```json
[
  {
    "id": 1,
    "tenantId": "550e8400-e29b-41d4-a716-446655440000",
    "channel": "MESSENGER",
    "pageId": "123456789",
    "appId": "987654321",
    "createdAt": "2026-04-20T09:01:00Z"
  }
]
```

---

## Webhook Config

### Create Webhook Config

**`POST /api/tenants/{tenantId}/webhook-configs`** — Admin

Configures the HTTP callback URL for inbound message delivery.

**Request:**
```http
POST /api/tenants/550e8400-e29b-41d4-a716-446655440000/webhook-configs
Content-Type: application/json
X-Admin-Secret: <your-admin-secret>

{
  "callbackUrl": "https://your-app.com/webhook",
  "secret": "your-signing-secret",
  "enabled": true
}
```

**Response `201`:**
```json
{
  "id": 1,
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "callbackUrl": "https://your-app.com/webhook",
  "enabled": true,
  "createdAt": "2026-04-20T09:02:00Z"
}
```

---

### Get Webhook Config

**`GET /api/tenants/{tenantId}/webhook-configs`** — Admin

**Request:**
```http
GET /api/tenants/550e8400-e29b-41d4-a716-446655440000/webhook-configs
X-Admin-Secret: <your-admin-secret>
```

**Response `200`:**
```json
[
  {
    "id": 1,
    "tenantId": "550e8400-e29b-41d4-a716-446655440000",
    "callbackUrl": "https://your-app.com/webhook",
    "enabled": true,
    "createdAt": "2026-04-20T09:02:00Z"
  }
]
```

---

## Messages

### Send Message

**`POST /api/messages/send`** — Tenant API Key

Send a message to a user via the tenant's configured channel. This request is handled by **hub-api-proxy**, which proxies the call to Meta Graph API using the tenant's stored credentials.

**Request:**
```http
POST /api/messages/send
Content-Type: application/json
X-Api-Key: <tenant-api-key>

{
  "channel": "MESSENGER",
  "recipient": {
    "id": "1234567890"
  },
  "message": {
    "text": "Hello! How can I help you today?"
  }
}
```

**Sending a template message (WhatsApp):**
```json
{
  "channel": "WHATSAPP",
  "recipient": {
    "phoneNumber": "+1234567890"
  },
  "message": {
    "type": "template",
    "template": {
      "name": "order_confirmation",
      "language": { "code": "en_US" },
      "components": []
    }
  }
}
```

**Response `200`:**
```json
{
  "messageId": "mid.outbound_abc123",
  "status": "SENT",
  "timestamp": "2026-04-20T09:05:00Z"
}
```

**Error `400`:**
```json
{
  "error": "INVALID_CHANNEL",
  "message": "No credential configured for channel WHATSAPP"
}
```

---

## Message Logs

### Query Message Logs

Message log queries are available via the **Console UI** at `https://your-linkflare-host` under **Message Logs**, or via the admin API.

**`GET /api/tenants/{tenantId}/message-logs`** — Admin

| Query Param | Type | Description |
|-------------|------|-------------|
| `direction` | enum | `INBOUND` or `OUTBOUND` |
| `channel` | enum | `MESSENGER`, `WHATSAPP`, `INSTAGRAM` |
| `from` | ISO datetime | Start of time range |
| `to` | ISO datetime | End of time range |
| `page` | integer | Page number (default: 1) |
| `pageSize` | integer | Items per page (default: 20, max: 100) |

**Request:**
```http
GET /api/tenants/550e8400-e29b-41d4-a716-446655440000/message-logs?direction=INBOUND&pageSize=5
X-Admin-Secret: <your-admin-secret>
```

**Response `200`:**
```json
{
  "total": 42,
  "page": 1,
  "pageSize": 5,
  "items": [
    {
      "id": 101,
      "messageId": "mid.abc123",
      "tenantId": "550e8400-e29b-41d4-a716-446655440000",
      "channel": "MESSENGER",
      "direction": "INBOUND",
      "from": "1234567890",
      "to": "987654321",
      "messageType": "text",
      "body": { "text": "Hi there" },
      "timestamp": 1713600000,
      "createdAt": "2026-04-20T09:00:00Z"
    }
  ]
}
```

---

## Error Codes

| HTTP Status | Error Code | Description |
|-------------|-----------|-------------|
| 400 | `INVALID_REQUEST` | Missing or malformed request body |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication header |
| 403 | `FORBIDDEN` | Valid credentials but insufficient permissions |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource (e.g., page_id already registered) |
| 500 | `INTERNAL_ERROR` | Server error |
