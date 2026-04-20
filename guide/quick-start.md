# Quick Start

Get LinkFlare up and running in 5 minutes.

## Prerequisites

Before you begin, make sure you have:

- A **Meta Developer account** with an App created at [developers.facebook.com](https://developers.facebook.com)
- A **Facebook Page** (for Messenger) or **WhatsApp Business Account**
- A **Page Access Token** with `pages_messaging` permission (for Messenger)
- A running **LinkFlare** instance (see [self-hosted deployment](/self-hosted/edge-agent) or use a hosted plan)

---

## Step 1: Create a Tenant

A tenant represents one of your customers (or your own app). Each tenant has its own credentials and message routing config.

```bash
curl -X POST https://your-linkflare-host/api/tenants \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: <your-admin-secret>" \
  -d '{
    "name": "Acme Corp"
  }'
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Acme Corp",
  "apiKey": "lf_sk_abc123xyz...",
  "status": "ACTIVE",
  "createdAt": "2026-04-20T09:00:00Z"
}
```

> Save the `apiKey` — this is the tenant's credential for calling the message send API. It won't be shown again in full.

---

## Step 2: Configure Messenger Credentials

Link the tenant's Meta Page Access Token so LinkFlare can send messages on their behalf.

```bash
curl -X POST https://your-linkflare-host/api/tenants/550e8400-e29b-41d4-a716-446655440000/credentials \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: <your-admin-secret>" \
  -d '{
    "channel": "MESSENGER",
    "pageId": "123456789",
    "accessToken": "EAAxxxxx...",
    "appId": "987654321",
    "appSecret": "abc123def456..."
  }'
```

**Response:**

```json
{
  "id": 1,
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "channel": "MESSENGER",
  "pageId": "123456789",
  "createdAt": "2026-04-20T09:01:00Z"
}
```

> Credentials are encrypted at rest using AES-256-GCM. The raw token is never stored in plaintext.

---

## Step 3: Configure Webhook Callback URL

Tell LinkFlare where to forward incoming messages for this tenant.

```bash
curl -X POST https://your-linkflare-host/api/tenants/550e8400-e29b-41d4-a716-446655440000/webhook-configs \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: <your-admin-secret>" \
  -d '{
    "callbackUrl": "https://your-app.com/linkflare/webhook",
    "secret": "my-webhook-signing-secret",
    "enabled": true
  }'
```

**Response:**

```json
{
  "id": 1,
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "callbackUrl": "https://your-app.com/linkflare/webhook",
  "enabled": true,
  "createdAt": "2026-04-20T09:02:00Z"
}
```

---

## Step 4: Register Meta Webhook

In your [Meta App Dashboard](https://developers.facebook.com), configure the webhook:

- **Callback URL**: `https://your-linkflare-host/webhook/meta`
- **Verify Token**: (set in LinkFlare's `META_VERIFY_TOKEN` env var)
- **Subscribed fields**: `messages`, `messaging_postbacks`

---

## Step 5: Verify — Receive a Test Message

Send a message to your Facebook Page. LinkFlare will receive it and POST it to your `callbackUrl`.

Your endpoint should receive a payload like:

```json
{
  "messageId": "mid.abc123",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "channel": "MESSENGER",
  "direction": "INBOUND",
  "from": "1234567890",
  "to": "123456789",
  "messageType": "text",
  "body": {
    "text": "Hello!"
  },
  "timestamp": 1713600000
}
```

---

## Minimal Node.js Webhook Receiver

Here's the simplest possible Express server to receive LinkFlare webhook events:

```js
const express = require('express')
const app = express()

app.use(express.json())

app.post('/linkflare/webhook', (req, res) => {
  const deliveryId = req.headers['x-delivery-id']
  const event = req.headers['x-linkflare-event']
  const message = req.body

  console.log(`[${event}] DeliveryID: ${deliveryId}`)
  console.log('Message:', JSON.stringify(message, null, 2))

  // Always return 2xx to acknowledge delivery
  res.status(200).json({ ok: true })
})

app.listen(3000, () => {
  console.log('Webhook receiver listening on port 3000')
})
```

> **Important**: Always return a `2xx` response. If your server returns `4xx` or `5xx`, or times out, LinkFlare will retry delivery with exponential backoff.

---

## What's Next?

- [Webhook Integration Guide](/guide/webhook-integration) — retry logic, idempotency, signature verification
- [API Reference](/api/reference) — full list of endpoints
- [Edge Agent](/self-hosted/edge-agent) — receive messages without a public callback URL
