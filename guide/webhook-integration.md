# Webhook Integration

Learn how to reliably receive messages from LinkFlare using HTTP webhooks.

## How It Works

```
User sends message
      ↓
Meta Platform (WhatsApp / Messenger)
      ↓
LinkFlare hub-webhook-service (receives & validates)
      ↓
Kafka (decoupled queue)
      ↓
hub-tunnel-manager (consumes & routes)
      ↓
HTTP POST → your callbackUrl
```

When a user sends a message to your Meta Page or WhatsApp number, Meta delivers it to LinkFlare. LinkFlare normalizes the message and forwards it to your configured `callbackUrl` via HTTP POST with JSON body.

---

## Configuring Your Callback URL

### Via Console UI

1. Log in to the LinkFlare Console
2. Navigate to **Tenants** → select your tenant
3. Open **Webhook Config**
4. Enter your `callbackUrl` and an optional signing secret
5. Toggle **Enabled** → Save

### Via API

```bash
curl -X POST https://your-linkflare-host/api/tenants/{tenantId}/webhook-configs \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: <your-admin-secret>" \
  -d '{
    "callbackUrl": "https://your-app.com/webhook",
    "secret": "your-signing-secret",
    "enabled": true
  }'
```

---

## Message Body Format

LinkFlare delivers a normalized `StandardMessage` JSON object to your endpoint:

```json
{
  "messageId": "mid.abc123xyz",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "channel": "MESSENGER",
  "direction": "INBOUND",
  "from": "1234567890",
  "to": "987654321",
  "messageType": "text",
  "body": {
    "text": "Hello, I need help!"
  },
  "timestamp": 1713600000
}
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `messageId` | string | Unique message ID from Meta (e.g., `mid.xxx`) |
| `tenantId` | string (UUID) | The LinkFlare tenant this message belongs to |
| `channel` | enum | `MESSENGER`, `WHATSAPP`, or `INSTAGRAM` |
| `direction` | enum | `INBOUND` (user → page) or `OUTBOUND` (page → user) |
| `from` | string | Sender identifier (PSID for Messenger, phone number for WhatsApp) |
| `to` | string | Recipient identifier (your Page ID or phone number) |
| `messageType` | string | `text`, `image`, `audio`, `video`, `file`, `template`, `sticker` |
| `body` | object | Message content; structure varies by `messageType` |
| `timestamp` | number | Unix timestamp in seconds |

### `body` by Message Type

**text:**
```json
{ "text": "Hello!" }
```

**image:**
```json
{ "url": "https://cdn.example.com/image.jpg", "mimeType": "image/jpeg" }
```

**template (WhatsApp):**
```json
{ "templateName": "order_confirmation", "language": "en_US", "components": [] }
```

---

## Request Headers

LinkFlare adds the following headers to every webhook delivery:

| Header | Description |
|--------|-------------|
| `X-LinkFlare-Event` | Event type, e.g., `message.inbound` |
| `X-Delivery-ID` | Unique delivery attempt ID (UUID). Use this for idempotency. |
| `X-LinkFlare-Signature` | HMAC-SHA256 signature of the request body, using your webhook secret. Format: `sha256=<hex>` |
| `Content-Type` | Always `application/json` |

### Verifying the Signature

```js
const crypto = require('crypto')

function verifySignature(body, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}
```

---

## Response Requirements

Your endpoint must return an HTTP `2xx` status code within **10 seconds** to acknowledge successful delivery.

| Response | Outcome |
|----------|---------|
| `2xx` | ✅ Delivery confirmed, no retry |
| `4xx` | ❌ Client error — LinkFlare will retry |
| `5xx` | ❌ Server error — LinkFlare will retry |
| Timeout (>10s) | ❌ Treated as failure, will retry |

> Return `200 OK` as quickly as possible. If you need to do heavy processing, acknowledge receipt immediately and process asynchronously.

---

## Retry Mechanism

LinkFlare uses **exponential backoff** for failed deliveries:

| Attempt | Delay |
|---------|-------|
| 1st retry | ~30 seconds |
| 2nd retry | ~1 minute |
| 3rd retry | ~3 minutes |
| 4th retry | ~10 minutes |
| 5th retry | ~30 minutes |
| ... | doubles each time |
| 10th retry (final) | ~6 hours after first attempt |

After **10 failed attempts**, the delivery is marked `EXHAUSTED` and no further retries occur. You can view failed deliveries in the Console under **Message Logs**.

---

## Idempotency

Because LinkFlare guarantees **at-least-once delivery**, your endpoint may occasionally receive the same message twice (e.g., during retries after a brief network hiccup).

**Best practice**: Use the `X-Delivery-ID` header as your idempotency key.

```js
// Example: store processed delivery IDs in Redis
const deliveryId = req.headers['x-delivery-id']

if (await redis.get(`delivery:${deliveryId}`)) {
  return res.status(200).json({ ok: true, duplicate: true })
}

// Process the message...
await processMessage(req.body)

// Mark as processed (TTL: 24 hours is sufficient)
await redis.setex(`delivery:${deliveryId}`, 86400, '1')

res.status(200).json({ ok: true })
```

---

## Code Examples

### Python (FastAPI)

```python
import hmac
import hashlib
from fastapi import FastAPI, Request, HTTPException, Header
from typing import Optional
import redis.asyncio as redis

app = FastAPI()
r = redis.Redis(host='localhost', port=6379, decode_responses=True)

WEBHOOK_SECRET = "your-signing-secret"

@app.post("/webhook")
async def receive_webhook(
    request: Request,
    x_delivery_id: Optional[str] = Header(None),
    x_linkflare_event: Optional[str] = Header(None),
    x_linkflare_signature: Optional[str] = Header(None),
):
    body = await request.body()

    # Verify signature
    expected = "sha256=" + hmac.new(
        WEBHOOK_SECRET.encode(), body, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, x_linkflare_signature or ""):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Idempotency check
    if x_delivery_id:
        key = f"delivery:{x_delivery_id}"
        if await r.get(key):
            return {"ok": True, "duplicate": True}
        await r.setex(key, 86400, "1")

    message = await request.json()
    print(f"[{x_linkflare_event}] from={message['from']} text={message.get('body', {}).get('text')}")

    # Your business logic here...

    return {"ok": True}
```

### Node.js (Express)

```js
const express = require('express')
const crypto = require('crypto')
const { createClient } = require('redis')

const app = express()
const redisClient = createClient()
await redisClient.connect()

const WEBHOOK_SECRET = 'your-signing-secret'

// Use raw body for signature verification
app.use('/webhook', express.raw({ type: 'application/json' }))

app.post('/webhook', async (req, res) => {
  const signature = req.headers['x-linkflare-signature']
  const deliveryId = req.headers['x-delivery-id']
  const event = req.headers['x-linkflare-event']

  // Verify signature
  const expected = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(req.body)
    .digest('hex')

  if (!crypto.timingSafeEqual(Buffer.from(signature || ''), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // Idempotency check
  if (deliveryId) {
    const exists = await redisClient.get(`delivery:${deliveryId}`)
    if (exists) {
      return res.status(200).json({ ok: true, duplicate: true })
    }
    await redisClient.setEx(`delivery:${deliveryId}`, 86400, '1')
  }

  const message = JSON.parse(req.body)
  console.log(`[${event}] from=${message.from}`, message.body)

  // Your business logic here...

  res.status(200).json({ ok: true })
})

app.listen(3000)
```
