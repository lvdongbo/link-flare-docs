# Edge Agent

## What is Edge Agent?

Edge Agent is a lightweight process provided by LinkFlare that runs on your own server. It maintains a persistent WebSocket connection to the LinkFlare Hub and receives your account's inbound messages in real time — no public HTTP endpoint required. It's the right choice when your service runs inside a private network or you'd rather not expose a public-facing URL.

---

## When to use Edge Agent vs Webhook

| | Webhook | Edge Agent |
|--|---------|------------|
| **Setup** | Configure a public HTTPS URL in Console | Run a process on your server |
| **Network requirement** | Public HTTPS endpoint | Outbound internet access only |
| **Best for** | Cloud-hosted apps | Internal networks, no public IP |
| **Message format** | JSON over HTTP POST | Same JSON, delivered over WebSocket |

---

## Prerequisites

- A server with outbound internet access (no inbound ports required)
- Docker *(recommended)* or Java 21+
- An **Edge ID** and **Edge Secret** — provided by the LinkFlare team

---

## Configuration

Edge Agent is configured via environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `EDGE_ID` | Your edge node identifier | `edge-your-company` |
| `EDGE_SECRET` | Authentication secret | `your-secret-key` |
| `HUB_WSS_URL` | LinkFlare Hub WebSocket URL | `wss://your-linkflare-host/tunnel` |

---

## Running with Docker

```bash
docker run -d \
  --name linkflare-edge \
  --restart unless-stopped \
  -e EDGE_ID=edge-your-company \
  -e EDGE_SECRET=your-secret-key \
  -e HUB_WSS_URL=wss://your-linkflare-host/tunnel \
  -p 8085:8085 \
  linkflare/edge-agent:latest
```

The `--restart unless-stopped` flag ensures the agent comes back up automatically after a server reboot or crash.

---

## Receiving messages

Once running, Edge Agent exposes a local WebSocket endpoint:

```
ws://localhost:8085/ws/subscribe
```

Connect your application to this endpoint to receive messages in real time. The message format is identical to the Webhook payload — same JSON structure, same fields.

### Node.js example

```js
const WebSocket = require('ws')

const ws = new WebSocket('ws://localhost:8085/ws/subscribe')

ws.on('open', () => {
  console.log('Connected to Edge Agent')
})

ws.on('message', (data) => {
  const message = JSON.parse(data)
  console.log('Received:', message.messageId, 'from:', message.from)

  // Process the message here...
})

ws.on('close', () => {
  console.log('Disconnected — consider reconnecting')
})
```

::: tip
Implement reconnection logic in your client. If Edge Agent restarts or the connection drops, your app should reconnect automatically.
:::

---

## Verifying the connection

Check the container logs to confirm the agent authenticated and connected successfully:

```bash
docker logs linkflare-edge
```

Look for a line containing `HANDSHAKE_COMPLETE` — that means the agent is authenticated and ready to receive messages:

```
INFO  [EdgeAgent] HANDSHAKE_COMPLETE — connected to hub, awaiting messages
```

If you see repeated connection errors, double-check your `EDGE_ID`, `EDGE_SECRET`, and `HUB_WSS_URL` values.
