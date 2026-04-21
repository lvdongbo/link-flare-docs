# Quick Start

Get up and running with LinkFlare in minutes.

## Prerequisites

- A LinkFlare account (contact the LinkFlare team to get one)
- An API Key in the format `lf_sk_...`
- At least one channel (Messenger or WhatsApp) already configured by the LinkFlare team

---

## Step 1: Choose how to receive messages

LinkFlare supports two delivery modes:

| Mode | How it works | Best for |
|------|-------------|----------|
| **Webhook** *(recommended)* | LinkFlare HTTP POSTs inbound messages to your callback URL | Cloud-hosted apps with a public HTTPS endpoint |
| **Edge Agent** | Run a lightweight agent on your server; receive messages over WebSocket | Internal networks, no public IP |

Most use cases should start with Webhook. Use Edge Agent if your service runs behind a firewall or you'd rather not expose a public endpoint.

---

## Step 2: Set up your Webhook endpoint

### Configure the callback URL

Go to the **Webhook** settings page in the LinkFlare Console and enter your HTTPS URL, then save.

### Implement the endpoint

Here's the minimal Express server to receive messages:

```js
const express = require('express')
const app = express()
app.use(express.json())

app.post('/webhook', (req, res) => {
  const deliveryId = req.headers['x-delivery-id']
  const message = req.body

  console.log('Received message:', message.messageId, 'from:', message.from)

  // Process the message here...

  // Always respond with 2xx to confirm receipt
  res.sendStatus(200)
})

app.listen(3000)
```

Two things to remember:
- **Always return `2xx`** — any other status code (or a timeout) triggers a retry.
- **Use `X-Delivery-ID` for idempotency** — the same message may be delivered more than once in edge cases.

> Prefer Edge Agent? Skip to the [Edge Agent guide](/self-hosted/edge-agent).

---

## Step 3: Send a message

Use your API Key to call the Send Message endpoint:

```bash
curl -X POST https://your-linkflare-host/api/messages/send \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: lf_sk_your_api_key" \
  -d '{
    "channel": "MESSENGER",
    "to": "PSID_OF_RECIPIENT",
    "type": "text",
    "text": "Hello from LinkFlare!"
  }'
```

Replace `your-linkflare-host` with the hostname provided by your LinkFlare team.

---

## Step 4: Test the full flow

1. Send a message to your page from a Messenger or WhatsApp account.
2. Verify your Webhook endpoint received the POST request.
3. Call the Send Message API to reply.

That's it. You're live.

---

**Next:** [Webhook Integration](/guide/webhook-integration) — retry behaviour, idempotency, and supported message types.
