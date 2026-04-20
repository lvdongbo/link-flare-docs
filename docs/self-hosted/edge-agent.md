# Edge Agent

Receive LinkFlare messages inside your own network — no public callback URL required.

## What Is Edge Agent?

The **edge-tunnel-agent** is a lightweight service you run on your own infrastructure. It connects to the LinkFlare Hub via a persistent **WebSocket tunnel** and receives inbound messages in real time.

```
Meta → LinkFlare Hub → WS Tunnel → edge-tunnel-agent (your network)
                                           ↓
                              your app connects to /ws/subscribe
```

The edge agent acts as a local relay: it maintains an outbound connection to the Hub (no inbound firewall rules needed), and exposes a local WebSocket endpoint for your application to subscribe to.

---

## Use Cases

- You **don't want to expose a public HTTPS endpoint** for webhooks
- You need to process messages **inside a private network** (VPN, internal cluster)
- You're running on a machine **without a static IP or domain**
- You want **lower latency** for message processing by co-locating with your app

---

## Prerequisites

- Docker installed on the target machine
- Outbound internet access (HTTPS/WSS to your LinkFlare Hub)
- An **Edge Node** registered in LinkFlare Console (or via API) for your tenant
- The `EDGE_ID` and `EDGE_SECRET` assigned during registration

### Register an Edge Node (Admin API)

```bash
curl -X POST https://your-linkflare-host/api/edge-nodes \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: <your-admin-secret>" \
  -d '{
    "tenantId": "550e8400-e29b-41d4-a716-446655440000",
    "edgeId": "edge-prod-01",
    "secret": "my-edge-secret",
    "description": "Production server, Singapore DC"
  }'
```

---

## Configuration

| Config Item | Environment Variable | Description |
|-------------|---------------------|-------------|
| Edge Node ID | `EDGE_ID` | Unique identifier for this edge node (assigned during registration) |
| Edge Secret | `EDGE_SECRET` | Authentication secret for the tunnel connection |
| Hub WS URL | `HUB_WS_URL` | WebSocket address of the LinkFlare Hub tunnel port |
| Local WS Port | `LOCAL_WS_PORT` | Port to expose `/ws/subscribe` on (default: `8085`) |

**Example `.env`:**
```dotenv
EDGE_ID=edge-prod-01
EDGE_SECRET=my-edge-secret
HUB_WS_URL=wss://your-linkflare-host/tunnel
LOCAL_WS_PORT=8085
```

---

## Deploy with Docker

```bash
docker run -d \
  --name linkflare-edge \
  --restart unless-stopped \
  -e EDGE_ID=edge-prod-01 \
  -e EDGE_SECRET=my-edge-secret \
  -e HUB_WS_URL=wss://your-linkflare-host/tunnel \
  -e LOCAL_WS_PORT=8085 \
  -p 8085:8085 \
  ghcr.io/lvdongbo/link-flare/edge-tunnel-agent:latest
```

### Or with Docker Compose

```yaml
services:
  edge-agent:
    image: ghcr.io/lvdongbo/link-flare/edge-tunnel-agent:latest
    restart: unless-stopped
    environment:
      EDGE_ID: edge-prod-01
      EDGE_SECRET: my-edge-secret
      HUB_WS_URL: wss://your-linkflare-host/tunnel
      LOCAL_WS_PORT: "8085"
    ports:
      - "8085:8085"
```

---

## Verify Connection

After starting the container, check the logs:

```bash
docker logs -f linkflare-edge
```

You should see:

```
[EdgeAgent] Connecting to wss://your-linkflare-host/tunnel ...
[EdgeAgent] Tunnel established. Edge ID: edge-prod-01
[EdgeAgent] Listening for subscribers on ws://0.0.0.0:8085/ws/subscribe
```

In the LinkFlare Console, navigate to **Edge Nodes** — your node should show status **ONLINE**.

---

## Receiving Messages

Your application connects to the local WebSocket endpoint exposed by the edge agent:

```
ws://localhost:8085/ws/subscribe
```

### Message Format

Messages are delivered as JSON text frames, using the same `StandardMessage` format as HTTP webhooks:

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
    "text": "Hello from Messenger!"
  },
  "timestamp": 1713600000
}
```

### Node.js Example

```js
const WebSocket = require('ws')

const ws = new WebSocket('ws://localhost:8085/ws/subscribe')

ws.on('open', () => {
  console.log('Connected to LinkFlare Edge Agent')
})

ws.on('message', (data) => {
  const message = JSON.parse(data)
  console.log(`New message from ${message.from}: ${message.body?.text}`)
  // Your business logic here
})

ws.on('close', () => {
  console.log('Connection closed, reconnecting in 5s...')
  setTimeout(reconnect, 5000)
})

ws.on('error', (err) => {
  console.error('WebSocket error:', err.message)
})
```

### Python Example

```python
import asyncio
import json
import websockets

async def subscribe():
    uri = "ws://localhost:8085/ws/subscribe"
    async with websockets.connect(uri) as ws:
        print("Connected to LinkFlare Edge Agent")
        async for raw in ws:
            message = json.loads(raw)
            print(f"New message from {message['from']}: {message.get('body', {}).get('text')}")
            # Your business logic here

asyncio.run(subscribe())
```

---

## Connection Behavior

| Parameter | Value |
|-----------|-------|
| Heartbeat interval | 30 seconds (client → hub PING) |
| Idle timeout | 90 seconds (hub closes if no data) |
| Reconnect behavior | Client-side auto-reconnect recommended |
| Protocol | WebSocket over TLS (WSS) |

> The edge agent automatically handles heartbeats with the Hub. Your application only needs to handle reconnection to the local `ws://localhost:8085/ws/subscribe` endpoint.

---

## Troubleshooting

**Tunnel fails to connect:**
- Verify `HUB_WS_URL` is correct and reachable from the container
- Check that the edge node is registered in Console and `EDGE_ID`/`EDGE_SECRET` match
- Check firewall rules allow outbound WSS connections

**No messages arriving:**
- Ensure the tenant has **no** `callbackUrl` configured (Webhook Push takes priority over WS tunnel)
- Confirm the edge node is registered under the correct `tenantId`
- Check Hub logs for tunnel routing errors
