# WebSocket API Specification

## Overview

The WebSocket API provides real-time market data streaming for the cryptocurrency trading platform. It supports multiple data streams including order book updates, trade feeds, and ticker information.

**WebSocket URL**: `ws://localhost:3001`

## Connection Management

### Establishing Connection

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = () => {
  console.log('Connected to trading platform');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Connection closed');
};
```

### Authentication

Currently using simplified user ID based authentication. Send user identification after connection:

```javascript
ws.send(JSON.stringify({
  method: 'SUBSCRIBE',
  params: ['depth@TATA_INR'],
  id: 1
}));
```

## Message Format

### Request Message Format

```json
{
  "method": "SUBSCRIBE" | "UNSUBSCRIBE",
  "params": ["stream_name"],
  "id": number
}
```

### Response Message Format

```json
{
  "stream": "stream_name",
  "data": {
    // Stream-specific data
  }
}
```

### Error Message Format

```json
{
  "error": {
    "code": number,
    "msg": "error_message"
  },
  "id": number
}
```

## Available Streams

### 1. Order Book Depth Stream

**Stream Name**: `depth@{symbol}`

**Description**: Real-time order book updates with bid and ask changes.

**Subscribe**:
```json
{
  "method": "SUBSCRIBE",
  "params": ["depth@TATA_INR"],
  "id": 1
}
```

**Message Format**:
```json
{
  "stream": "depth@TATA_INR",
  "data": {
    "e": "depth",
    "s": "TATA_INR",
    "b": [
      ["100.50", "150"],
      ["100.25", "200"]
    ],
    "a": [
      ["100.75", "100"],
      ["101.00", "250"]
    ],
    "timestamp": 1692345600000
  }
}
```

**Fields**:
- `e`: Event type ("depth")
- `s`: Symbol
- `b`: Bids (array of [price, quantity])
- `a`: Asks (array of [price, quantity])
- `timestamp`: Update timestamp

**Update Types**:
- **Full Update**: Complete order book snapshot
- **Incremental Update**: Only changed price levels
- **Price Level Removal**: Quantity "0" indicates removal

### 2. Trade Stream

**Stream Name**: `trade@{symbol}`

**Description**: Real-time trade execution data.

**Subscribe**:
```json
{
  "method": "SUBSCRIBE",
  "params": ["trade@TATA_INR"],
  "id": 2
}
```

**Message Format**:
```json
{
  "stream": "trade@TATA_INR",
  "data": {
    "e": "trade",
    "s": "TATA_INR",
    "t": 12345,
    "p": "100.50",
    "q": "5.0",
    "m": true,
    "timestamp": 1692345600000
  }
}
```

**Fields**:
- `e`: Event type ("trade")
- `s`: Symbol
- `t`: Trade ID
- `p`: Price
- `q`: Quantity
- `m`: Is buyer maker (true if buyer is maker, false if seller is maker)
- `timestamp`: Trade timestamp

### 3. Ticker Stream

**Stream Name**: `ticker@{symbol}`

**Description**: 24-hour rolling ticker statistics.

**Subscribe**:
```json
{
  "method": "SUBSCRIBE",
  "params": ["ticker@TATA_INR"],
  "id": 3
}
```

**Message Format**:
```json
{
  "stream": "ticker@TATA_INR",
  "data": {
    "e": "24hrTicker",
    "s": "TATA_INR",
    "p": "1.50",
    "P": "1.52",
    "w": "100.25",
    "x": "99.00",
    "c": "100.50",
    "Q": "5.0",
    "b": "100.25",
    "B": "10.0",
    "a": "100.75",
    "A": "8.0",
    "o": "99.00",
    "h": "102.00",
    "l": "98.50",
    "v": "150000",
    "q": "15075000.00",
    "O": 1692259200000,
    "C": 1692345600000,
    "F": 10000,
    "L": 12500,
    "n": 2500
  }
}
```

**Fields**:
- `e`: Event type ("24hrTicker")
- `s`: Symbol
- `p`: Price change
- `P`: Price change percent
- `w`: Weighted average price
- `x`: Previous close price
- `c`: Current close price (last price)
- `Q`: Close quantity (last quantity)
- `b`: Best bid price
- `B`: Best bid quantity
- `a`: Best ask price
- `A`: Best ask quantity
- `o`: Open price
- `h`: High price
- `l`: Low price
- `v`: Total traded base asset volume
- `q`: Total traded quote asset volume
- `O`: Statistics open time
- `C`: Statistics close time
- `F`: First trade ID
- `L`: Last trade ID
- `n`: Total count of trades

### 4. Kline/Candlestick Stream

**Stream Name**: `kline_{interval}@{symbol}`

**Description**: Real-time candlestick/kline data for charting.

**Available Intervals**: `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`

**Subscribe**:
```json
{
  "method": "SUBSCRIBE",
  "params": ["kline_1h@TATA_INR"],
  "id": 4
}
```

**Message Format**:
```json
{
  "stream": "kline_1h@TATA_INR",
  "data": {
    "e": "kline",
    "s": "TATA_INR",
    "k": {
      "t": 1692345600000,
      "T": 1692349200000,
      "s": "TATA_INR",
      "i": "1h",
      "o": "100.00",
      "c": "100.50",
      "h": "101.50",
      "l": "99.75",
      "v": "15000",
      "n": 150,
      "x": false,
      "q": "1507500.00",
      "V": "7500",
      "Q": "753750.00"
    }
  }
}
```

**Kline Fields (`k` object)**:
- `t`: Kline start time
- `T`: Kline close time
- `s`: Symbol
- `i`: Interval
- `o`: Open price
- `c`: Close price
- `h`: High price
- `l`: Low price
- `v`: Base asset volume
- `n`: Number of trades
- `x`: Is this kline closed? (true when kline is complete)
- `q`: Quote asset volume
- `V`: Taker buy base asset volume
- `Q`: Taker buy quote asset volume

### 5. User Data Stream (Private)

**Stream Name**: `user@{userId}`

**Description**: Private user data including order updates and balance changes.

**Subscribe**:
```json
{
  "method": "SUBSCRIBE",
  "params": ["user@user123"],
  "id": 5
}
```

**Order Update Message**:
```json
{
  "stream": "user@user123",
  "data": {
    "e": "executionReport",
    "s": "TATA_INR",
    "c": "",
    "S": "buy",
    "o": "LIMIT",
    "f": "GTC",
    "q": "10.0",
    "p": "100.50",
    "X": "FILLED",
    "i": "abc123def456",
    "l": "5.0",
    "z": "5.0",
    "L": "100.50",
    "n": "0.01",
    "N": "INR",
    "T": 1692345600000,
    "t": 12345
  }
}
```

**Balance Update Message**:
```json
{
  "stream": "user@user123",
  "data": {
    "e": "outboundAccountPosition",
    "B": [
      {
        "a": "INR",
        "f": "4500.00",
        "l": "500.00"
      },
      {
        "a": "TATA",
        "f": "25.5",
        "l": "4.5"
      }
    ]
  }
}
```

## Subscription Management

### Subscribe to Single Stream

```javascript
ws.send(JSON.stringify({
  method: 'SUBSCRIBE',
  params: ['depth@TATA_INR'],
  id: 1
}));
```

### Subscribe to Multiple Streams

```javascript
ws.send(JSON.stringify({
  method: 'SUBSCRIBE',
  params: [
    'depth@TATA_INR',
    'trade@TATA_INR',
    'ticker@TATA_INR'
  ],
  id: 1
}));
```

### Unsubscribe from Stream

```javascript
ws.send(JSON.stringify({
  method: 'UNSUBSCRIBE',
  params: ['depth@TATA_INR'],
  id: 2
}));
```

### List Active Subscriptions

```javascript
ws.send(JSON.stringify({
  method: 'LIST_SUBSCRIPTIONS',
  id: 3
}));
```

**Response**:
```json
{
  "result": [
    "depth@TATA_INR",
    "trade@TATA_INR"
  ],
  "id": 3
}
```

## Connection Limits and Rate Limits

- **Maximum Connections**: 5 per user
- **Maximum Subscriptions**: 50 per connection
- **Message Rate**: 100 messages per second per connection
- **Ping/Pong**: Required every 60 seconds to maintain connection

## Heartbeat and Connection Maintenance

### Ping/Pong Messages

The client should send ping messages to maintain the connection:

```javascript
// Send ping every 30 seconds
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.ping();
  }
}, 30000);

ws.on('pong', () => {
  console.log('Received pong');
});
```

### Automatic Reconnection

```javascript
class ReconnectingWebSocket {
  constructor(url) {
    this.url = url;
    this.reconnectInterval = 5000;
    this.maxReconnectAttempts = 10;
    this.reconnectAttempts = 0;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('Connected');
      this.reconnectAttempts = 0;
      this.resubscribe();
    };

    this.ws.onclose = () => {
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnecting... (${this.reconnectAttempts})`);
        this.connect();
      }, this.reconnectInterval);
    }
  }

  resubscribe() {
    // Resubscribe to previous streams
    this.subscriptions.forEach(stream => {
      this.subscribe(stream);
    });
  }
}
```

## Error Handling

### Error Codes

- `1`: Invalid JSON
- `2`: Invalid method
- `3`: Invalid parameters
- `4`: Subscription limit exceeded
- `5`: Stream not found
- `6`: Authentication required
- `7`: Rate limit exceeded
- `8`: Internal server error

### Error Response Example

```json
{
  "error": {
    "code": 3,
    "msg": "Invalid symbol"
  },
  "id": 1
}
```

## Complete Usage Examples

### Basic Market Data Client

```javascript
class MarketDataClient {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.subscriptions = new Set();
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.ws.onopen = () => {
      console.log('Connected to market data');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from market data');
    };
  }

  handleMessage(message) {
    switch (message.data?.e) {
      case 'depth':
        this.onDepthUpdate(message);
        break;
      case 'trade':
        this.onTradeUpdate(message);
        break;
      case '24hrTicker':
        this.onTickerUpdate(message);
        break;
    }
  }

  subscribeToDepth(symbol) {
    const stream = `depth@${symbol}`;
    this.subscribe(stream);
  }

  subscribeToTrades(symbol) {
    const stream = `trade@${symbol}`;
    this.subscribe(stream);
  }

  subscribe(stream) {
    this.ws.send(JSON.stringify({
      method: 'SUBSCRIBE',
      params: [stream],
      id: Date.now()
    }));
    this.subscriptions.add(stream);
  }

  onDepthUpdate(message) {
    console.log('Depth update:', message.data);
    // Update order book display
  }

  onTradeUpdate(message) {
    console.log('Trade update:', message.data);
    // Update trade history
  }

  onTickerUpdate(message) {
    console.log('Ticker update:', message.data);
    // Update ticker display
  }
}

// Usage
const client = new MarketDataClient('ws://localhost:3001');
client.subscribeToDepth('TATA_INR');
client.subscribeToTrades('TATA_INR');
```

### React Hook for WebSocket

```javascript
import { useState, useEffect, useRef } from 'react';

export function useWebSocket(url) {
  const [socket, setSocket] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting');

  useEffect(() => {
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      setConnectionStatus('Connected');
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setLastMessage(message);
    };

    ws.onclose = () => {
      setConnectionStatus('Disconnected');
    };

    ws.onerror = () => {
      setConnectionStatus('Error');
    };

    return () => {
      ws.close();
    };
  }, [url]);

  const sendMessage = (message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  };

  return { lastMessage, connectionStatus, sendMessage };
}

// Usage in React component
function TradingView({ symbol }) {
  const { lastMessage, connectionStatus, sendMessage } = useWebSocket('ws://localhost:3001');
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });

  useEffect(() => {
    sendMessage({
      method: 'SUBSCRIBE',
      params: [`depth@${symbol}`],
      id: 1
    });
  }, [symbol]);

  useEffect(() => {
    if (lastMessage?.data?.e === 'depth') {
      setOrderBook({
        bids: lastMessage.data.b,
        asks: lastMessage.data.a
      });
    }
  }, [lastMessage]);

  return (
    <div>
      <div>Status: {connectionStatus}</div>
      <div>Order Book for {symbol}</div>
      {/* Render order book */}
    </div>
  );
}
```

### Python WebSocket Client

```python
import asyncio
import websockets
import json

class TradingWebSocketClient:
    def __init__(self, uri):
        self.uri = uri
        self.websocket = None
        self.subscriptions = set()

    async def connect(self):
        self.websocket = await websockets.connect(self.uri)
        print("Connected to trading platform")

    async def listen(self):
        async for message in self.websocket:
            data = json.loads(message)
            await self.handle_message(data)

    async def handle_message(self, data):
        if 'stream' in data:
            if data['data']['e'] == 'depth':
                await self.on_depth_update(data)
            elif data['data']['e'] == 'trade':
                await self.on_trade_update(data)

    async def subscribe(self, streams):
        message = {
            "method": "SUBSCRIBE",
            "params": streams,
            "id": 1
        }
        await self.websocket.send(json.dumps(message))

    async def on_depth_update(self, data):
        print(f"Depth update: {data}")

    async def on_trade_update(self, data):
        print(f"Trade update: {data}")

# Usage
async def main():
    client = TradingWebSocketClient('ws://localhost:3001')
    await client.connect()
    await client.subscribe(['depth@TATA_INR', 'trade@TATA_INR'])
    await client.listen()

asyncio.run(main())
```

## Testing WebSocket Connections

### Using websocat

```bash
# Install websocat
cargo install websocat

# Connect and subscribe
echo '{"method":"SUBSCRIBE","params":["depth@TATA_INR"],"id":1}' | websocat ws://localhost:3001
```

### Using wscat

```bash
# Install wscat
npm install -g wscat

# Connect
wscat -c ws://localhost:3001

# Send subscription
{"method":"SUBSCRIBE","params":["depth@TATA_INR"],"id":1}
```

## Performance Considerations

- **Buffer Size**: Increase buffer size for high-frequency data
- **Compression**: Enable per-message deflate compression
- **Batching**: Batch multiple updates into single messages
- **Filtering**: Client-side filtering to reduce network traffic
- **Selective Subscriptions**: Only subscribe to needed streams

## Security Considerations

- **Authentication**: Implement proper user authentication
- **Rate Limiting**: Prevent abuse with connection and message limits
- **Input Validation**: Validate all incoming messages
- **CORS**: Configure appropriate CORS policies
- **TLS**: Use WSS (WebSocket Secure) in production

---

This WebSocket specification provides comprehensive real-time data streaming capabilities for the trading platform. It supports all major market data types and includes proper error handling and connection management.