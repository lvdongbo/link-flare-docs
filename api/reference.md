# API Reference

## Send a Message

```
POST /api/messages/send
```

Send an outbound message to a user on Messenger or WhatsApp.

---

## Authentication

Include your API Key in every request:

```
X-Api-Key: lf_sk_your_api_key
```

Your API Key was provided when your account was created. You can view it in the LinkFlare Console.

---

## Request body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `channel` | string | ✅ | `MESSENGER` or `WHATSAPP` |
| `to` | string | ✅ | Recipient ID. PSID for Messenger; E.164 phone number for WhatsApp (e.g. `+1234567890`) |
| `type` | string | ✅ | Message type: `text`, `image`, `audio`, `video`, or `file` |
| `text` | string | ✅ for `text` | Message text content |
| `mediaUrl` | string | ✅ for media types | Publicly accessible URL of the media file to send |
| `caption` | string | ❌ | Caption displayed below the media (image and video only) |

---

## Examples

### Text message

```bash
curl -X POST https://your-linkflare-host/api/messages/send \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: lf_sk_your_api_key" \
  -d '{
    "channel": "MESSENGER",
    "to": "1234567890",
    "type": "text",
    "text": "Hello! How can I help you?"
  }'
```

### Image message

```bash
curl -X POST https://your-linkflare-host/api/messages/send \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: lf_sk_your_api_key" \
  -d '{
    "channel": "MESSENGER",
    "to": "1234567890",
    "type": "image",
    "mediaUrl": "https://example.com/image.jpg",
    "caption": "Check this out!"
  }'
```

### WhatsApp text message

```bash
curl -X POST https://your-linkflare-host/api/messages/send \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: lf_sk_your_api_key" \
  -d '{
    "channel": "WHATSAPP",
    "to": "+1234567890",
    "type": "text",
    "text": "Your order has been shipped!"
  }'
```

---

## Response

### Success — `200 OK`

```json
{
  "messageId": "mid.xyz789",
  "status": "sent",
  "timestamp": 1713600000
}
```

| Field | Description |
|-------|-------------|
| `messageId` | Platform-assigned message ID |
| `status` | Always `sent` on success |
| `timestamp` | Unix timestamp (seconds) of when the message was accepted |

### Error responses

| Status | Meaning |
|--------|---------|
| `400 Bad Request` | Missing or invalid request fields. Check the `message` field in the response body for details. |
| `401 Unauthorized` | Missing or invalid API Key. |
| `503 Service Unavailable` | The target channel is temporarily unavailable. Retry after a short delay. |

Error response body:

```json
{
  "error": "INVALID_API_KEY",
  "message": "The provided API key is not valid or has been revoked."
}
```
