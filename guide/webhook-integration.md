# Webhook Integration

Everything you need to know about receiving messages reliably via HTTP.

---

## How it works

```
User sends message
      │
      ▼
   Meta Platform
      │
      ▼
  LinkFlare Hub
      │  HTTP POST
      ▼
Your callback URL
```

When an inbound message arrives on your channel, LinkFlare immediately POSTs the payload to your registered callback URL. If delivery fails, LinkFlare retries automatically.

---

## Configuring your callback URL

In the LinkFlare Console, navigate to the **Webhook** configuration page, enter your HTTPS URL, and save. LinkFlare will start delivering messages to that URL immediately.

::: tip
Your callback URL must be publicly reachable over HTTPS. If you're developing locally, use a tunnel tool like [ngrok](https://ngrok.com) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/).
:::

---

## Message payload format

LinkFlare POSTs a JSON body for every inbound message:

```json
{
  "messageId": "mid.abc123",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "channel": "MESSENGER",
  "direction": "INBOUND",
  "from": "1234567890",
  "to": "987654321",
  "messageType": "text",
  "body": {
    "text": "Hello!"
  },
  "timestamp": 1713600000
}
```

### Field reference

| Field | Type | Description |
|-------|------|-------------|
| `messageId` | string | Unique message ID assigned by the upstream platform (Meta) |
| `tenantId` | string | Your LinkFlare tenant identifier |
| `channel` | string | `MESSENGER` or `WHATSAPP` |
| `direction` | string | Always `INBOUND` for webhook deliveries |
| `from` | string | Sender ID — PSID for Messenger, phone number for WhatsApp |
| `to` | string | Recipient ID — your page/channel identifier |
| `messageType` | string | Type of message content (see [Supported message types](#supported-message-types)) |
| `body` | object | Message content; structure varies by `messageType` |
| `timestamp` | number | Unix timestamp (seconds) when the message was received |

---

## Request headers

| Header | Description |
|--------|-------------|
| `X-LinkFlare-Event` | Always `message` for inbound messages |
| `X-Delivery-ID` | Unique delivery ID — use this for idempotency |
| `Content-Type` | `application/json` |

---

## Response requirements

| Your response | What happens |
|--------------|--------------|
| `2xx` | Delivery confirmed. No retry. |
| `4xx` / `5xx` | Delivery failed. Retry scheduled. |
| Timeout (> 10s) | Treated as failure. Retry scheduled. |

Return `200 OK` as fast as possible. Do your processing asynchronously if needed — just acknowledge receipt first.

---

## Retry policy

| Setting | Value |
|---------|-------|
| Max attempts | 10 |
| Backoff strategy | Exponential |
| Initial delay | 1 minute |
| Progression | 1m → 2m → 4m → 8m → … (capped at 6h) |
| After 10 failures | Marked as permanently failed — no more retries |

---

## Idempotency handling

LinkFlare uses a Redis-based idempotency lock to avoid duplicate deliveries in normal conditions. However, in rare network failure scenarios, the same message may be retried and delivered more than once.

**Best practice:** Store the `X-Delivery-ID` value after processing a message, and skip any message whose delivery ID you've already seen.

### Node.js example

```js
const processed = new Set() // Use a persistent store (DB/Redis) in production

app.post('/webhook', (req, res) => {
  const deliveryId = req.headers['x-delivery-id']

  if (processed.has(deliveryId)) {
    // Already handled — acknowledge and skip
    return res.sendStatus(200)
  }

  // Process the message
  const message = req.body
  console.log('Processing:', message.messageId)

  processed.add(deliveryId)
  res.sendStatus(200)
})
```

### Python example

```python
from flask import Flask, request

app = Flask(__name__)
processed = set()  # Use a persistent store (DB/Redis) in production

@app.post('/webhook')
def webhook():
    delivery_id = request.headers.get('X-Delivery-ID')

    if delivery_id in processed:
        # Already handled — acknowledge and skip
        return '', 200

    message = request.get_json()
    print(f"Processing: {message['messageId']}")

    processed.add(delivery_id)
    return '', 200
```

::: warning
The in-memory `Set` above is for illustration only. In production, persist delivery IDs in a database or Redis so your idempotency check survives restarts.
:::

---

## Supported message types

### `text`

```json
{
  "messageType": "text",
  "body": {
    "text": "Hello, world!"
  }
}
```

### `image`

```json
{
  "messageType": "image",
  "body": {
    "url": "https://cdn.example.com/photo.jpg",
    "caption": "Optional caption"
  }
}
```

### `audio`

```json
{
  "messageType": "audio",
  "body": {
    "url": "https://cdn.example.com/voice.ogg"
  }
}
```

### `video`

```json
{
  "messageType": "video",
  "body": {
    "url": "https://cdn.example.com/clip.mp4",
    "caption": "Optional caption"
  }
}
```

### `file`

```json
{
  "messageType": "file",
  "body": {
    "url": "https://cdn.example.com/document.pdf",
    "filename": "document.pdf"
  }
}
```

### `quick_reply`

```json
{
  "messageType": "quick_reply",
  "body": {
    "text": "Choose an option",
    "payload": "OPTION_A"
  }
}
```

The `payload` field contains the value set when the quick reply button was created.
