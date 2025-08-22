# Complete API Specification

## Overview

This document provides a comprehensive specification for all REST API endpoints in the stock trading platform. The API follows RESTful principles and provides JSON responses.

**Base URL**: `http://localhost:3000/api/v1`

## Authentication

Currently using simplified user ID based authentication. For production deployment, implement JWT or API key authentication.

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "timestamp": 1692345600000
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Additional error context
    }
  },
  "timestamp": 1692345600000
}
```

## Order Management Endpoints

### 1. Create Order

**Endpoint**: `POST /api/v1/order`

**Description**: Places a new buy or sell order in the order book.

**Request Body**:
```json
{
  "market": "TATA_INR",
  "price": "100.50",
  "quantity": "10",
  "side": "buy",
  "userId": "user123"
}
```

**Parameters**:
- `market` (string, required): Trading pair symbol (e.g., "TATA_INR")
- `price` (string, required): Order price (decimal as string)
- `quantity` (string, required): Order quantity (decimal as string)
- `side` (string, required): Order side ("buy" or "sell")
- `userId` (string, required): User identifier

**Response**:
```json
{
  "orderId": "abc123def456",
  "executedQty": 5.0,
  "fills": [
    {
      "price": "100.50",
      "qty": 5.0,
      "tradeId": 12345,
      "otherUserId": "user456",
      "markerOrderId": "existing_order_id"
    }
  ]
}
```

**Response Fields**:
- `orderId`: Unique identifier for the created order
- `executedQty`: Quantity that was immediately filled
- `fills`: Array of trade executions

**Error Codes**:
- `INSUFFICIENT_BALANCE`: User doesn't have enough balance
- `INVALID_MARKET`: Market doesn't exist
- `INVALID_PRICE`: Price is not a valid number
- `INVALID_QUANTITY`: Quantity is not a valid number
- `INVALID_SIDE`: Side must be "buy" or "sell"

### 2. Cancel Order

**Endpoint**: `DELETE /api/v1/order`

**Description**: Cancels an existing open order.

**Request Body**:
```json
{
  "orderId": "abc123def456",
  "market": "TATA_INR"
}
```

**Parameters**:
- `orderId` (string, required): Order ID to cancel
- `market` (string, required): Market symbol

**Response**:
```json
{
  "orderId": "abc123def456",
  "executedQty": 0,
  "remainingQty": 0
}
```

**Error Codes**:
- `ORDER_NOT_FOUND`: Order doesn't exist or already filled
- `INVALID_MARKET`: Market doesn't exist
- `UNAUTHORIZED`: User not authorized to cancel this order

### 3. Get Open Orders

**Endpoint**: `GET /api/v1/order/open`

**Description**: Retrieves all open orders for a user in a specific market.

**Query Parameters**:
- `userId` (string, required): User identifier
- `market` (string, required): Market symbol

**Example**: `GET /api/v1/order/open?userId=user123&market=TATA_INR`

**Response**:
```json
[
  {
    "orderId": "abc123def456",
    "price": 100.50,
    "quantity": 10,
    "filled": 3,
    "side": "buy",
    "userId": "user123",
    "timestamp": 1692345600000
  }
]
```

## Market Data Endpoints

### 1. Order Book Depth

**Endpoint**: `GET /api/v1/depth`

**Description**: Gets the current order book depth (aggregated bids and asks).

**Query Parameters**:
- `symbol` (string, required): Market symbol

**Example**: `GET /api/v1/depth?symbol=TATA_INR`

**Response**:
```json
{
  "bids": [
    ["100.50", "150"],
    ["100.25", "200"],
    ["100.00", "300"]
  ],
  "asks": [
    ["100.75", "100"],
    ["101.00", "250"],
    ["101.25", "180"]
  ]
}
```

**Response Fields**:
- `bids`: Array of [price, quantity] pairs, sorted by price descending
- `asks`: Array of [price, quantity] pairs, sorted by price ascending
- `timestamp`: Last update timestamp

### 2. Recent Trades

**Endpoint**: `GET /api/v1/trades`

**Description**: Gets recent trade history for a market.

**Query Parameters**:
- `symbol` (string, required): Market symbol
- `limit` (number, optional): Number of trades to return (default: 100, max: 1000)

**Example**: `GET /api/v1/trades?symbol=TATA_INR&limit=50`

**Response**:
```json
[
  {
    "id": "12345",
    "price": "100.50",
    "quantity": "5.0",
    "timestamp": 1692345600000,
    "isBuyerMaker": true
  }
]
```

### 3. Kline/Candlestick Data

**Endpoint**: `GET /api/v1/klines`

**Description**: Gets candlestick/OHLCV data for charting.

**Query Parameters**:
- `symbol` (string, required): Market symbol
- `interval` (string, required): Time interval ("1m", "5m", "15m", "1h", "4h", "1d")
- `startTime` (number, optional): Start timestamp
- `endTime` (number, optional): End timestamp
- `limit` (number, optional): Number of klines (default: 500, max: 1000)

**Example**: `GET /api/v1/klines?symbol=TATA_INR&interval=1h&limit=24`

**Response**:
```json
[
  [
    1692345600000,  // Open time
    "100.00",       // Open price
    "101.50",       // High price
    "99.75",        // Low price
    "100.50",       // Close price
    "15000",        // Volume
    1692349200000,  // Close time
    "1507500.00",   // Quote asset volume
    150,            // Number of trades
    "7500",         // Taker buy base asset volume
    "753750.00",    // Taker buy quote asset volume
    "0"             // Ignore
  ]
]
```

### 4. 24hr Ticker Statistics

**Endpoint**: `GET /api/v1/tickers/24hr`

**Description**: Gets 24-hour rolling ticker statistics.

**Query Parameters**:
- `symbol` (string, optional): Specific market symbol (if omitted, returns all)

**Example**: `GET /api/v1/tickers/24hr?symbol=TATA_INR`

**Response**:
```json
{
  "symbol": "TATA_INR",
  "priceChange": "1.50",
  "priceChangePercent": "1.52",
  "weightedAvgPrice": "100.25",
  "prevClosePrice": "99.00",
  "lastPrice": "100.50",
  "lastQty": "5.0",
  "bidPrice": "100.25",
  "askPrice": "100.75",
  "openPrice": "99.00",
  "highPrice": "102.00",
  "lowPrice": "98.50",
  "volume": "150000",
  "quoteVolume": "15075000.00",
  "openTime": 1692259200000,
  "closeTime": 1692345600000,
  "firstId": 10000,
  "lastId": 12500,
  "count": 2500
}
```

## User Management Endpoints

### 1. On-Ramp (Add Funds)

**Endpoint**: `POST /api/v1/onramp`

**Description**: Adds funds to a user's account (simplified implementation).

**Request Body**:
```json
{
  "userId": "user123",
  "amount": "1000.00",
  "currency": "INR"
}
```

**Response**:
```json
{
  "success": true,
  "newBalance": "5000.00"
}
```

### 2. Get Balance

**Endpoint**: `GET /api/v1/balance`

**Description**: Gets user's balance across all assets.

**Query Parameters**:
- `userId` (string, required): User identifier

**Example**: `GET /api/v1/balance?userId=user123`

**Response**:
```json
{
  "INR": {
    "available": "4500.00",
    "locked": "500.00"
  },
  "TATA": {
    "available": "25.5",
    "locked": "4.5"
  }
}
```

## Rate Limits

- **Order Operations**: 10 requests per second per user
- **Market Data**: 100 requests per second per IP
- **WebSocket Connections**: 5 concurrent connections per user

## Error Codes Reference

### Client Errors (4xx)

- `400 BAD_REQUEST`: Invalid request parameters
- `401 UNAUTHORIZED`: Authentication required
- `403 FORBIDDEN`: Access denied
- `404 NOT_FOUND`: Resource not found
- `429 TOO_MANY_REQUESTS`: Rate limit exceeded

### Server Errors (5xx)

- `500 INTERNAL_SERVER_ERROR`: Server error
- `502 BAD_GATEWAY`: Upstream service error
- `503 SERVICE_UNAVAILABLE`: Service temporarily unavailable

### Business Logic Errors

- `INSUFFICIENT_BALANCE`: Not enough funds for operation
- `INVALID_MARKET`: Market doesn't exist
- `ORDER_NOT_FOUND`: Order doesn't exist
- `INVALID_PRICE`: Price format invalid
- `INVALID_QUANTITY`: Quantity format invalid
- `MARKET_CLOSED`: Market not available for trading
- `ORDER_TOO_SMALL`: Order below minimum size
- `ORDER_TOO_LARGE`: Order above maximum size

## Example API Usage

### Complete Order Flow Example

```javascript
// 1. Check balance
const balance = await fetch('/api/v1/balance?userId=user123');

// 2. Place buy order
const order = await fetch('/api/v1/order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    market: 'TATA_INR',
    price: '100.50',
    quantity: '10',
    side: 'buy',
    userId: 'user123'
  })
});

// 3. Check order status
const openOrders = await fetch('/api/v1/order/open?userId=user123&market=TATA_INR');

// 4. Cancel if needed
if (needToCancel) {
  await fetch('/api/v1/order', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: order.orderId,
      market: 'TATA_INR'
    })
  });
}
```

### Market Data Streaming Example

```javascript
// Get initial order book
const depth = await fetch('/api/v1/depth?symbol=TATA_INR');

// Get recent trades
const trades = await fetch('/api/v1/trades?symbol=TATA_INR&limit=50');

// Get kline data for charts
const klines = await fetch('/api/v1/klines?symbol=TATA_INR&interval=1h&limit=24');

// Get ticker statistics
const ticker = await fetch('/api/v1/tickers/24hr?symbol=TATA_INR');
```

## SDK Examples

### JavaScript/TypeScript SDK

```typescript
class TradingClient {
  constructor(private baseUrl: string, private userId: string) {}

  async createOrder(params: OrderParams): Promise<OrderResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, userId: this.userId })
    });
    return response.json();
  }

  async getDepth(symbol: string): Promise<DepthResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/depth?symbol=${symbol}`);
    return response.json();
  }
}

// Usage
const client = new TradingClient('http://localhost:3000', 'user123');
const order = await client.createOrder({
  market: 'TATA_INR',
  price: '100.50',
  quantity: '10',
  side: 'buy'
});
```

### Python SDK

```python
import requests
import json

class TradingClient:
    def __init__(self, base_url, user_id):
        self.base_url = base_url
        self.user_id = user_id

    def create_order(self, market, price, quantity, side):
        url = f"{self.base_url}/api/v1/order"
        data = {
            "market": market,
            "price": price,
            "quantity": quantity,
            "side": side,
            "userId": self.user_id
        }
        response = requests.post(url, json=data)
        return response.json()

    def get_depth(self, symbol):
        url = f"{self.base_url}/api/v1/depth?symbol={symbol}"
        response = requests.get(url)
        return response.json()

# Usage
client = TradingClient('http://localhost:3000', 'user123')
order = client.create_order('TATA_INR', '100.50', '10', 'buy')
```

## Testing the API

### Using curl

```bash
# Create order
curl -X POST http://localhost:3000/api/v1/order \
  -H "Content-Type: application/json" \
  -d '{
    "market": "TATA_INR",
    "price": "100.50",
    "quantity": "10",
    "side": "buy",
    "userId": "user123"
  }'

# Get depth
curl "http://localhost:3000/api/v1/depth?symbol=TATA_INR"

# Cancel order
curl -X DELETE http://localhost:3000/api/v1/order \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "abc123def456",
    "market": "TATA_INR"
  }'
```

### Using Postman

Import the following collection:

```json
{
  "info": { "name": "Trading API" },
  "item": [
    {
      "name": "Create Order",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/v1/order",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"market\": \"TATA_INR\",\n  \"price\": \"100.50\",\n  \"quantity\": \"10\",\n  \"side\": \"buy\",\n  \"userId\": \"user123\"\n}"
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    }
  ]
}
```

## Performance Considerations

- **Caching**: Market data is cached for 100ms to reduce database load
- **Rate Limiting**: Implemented per endpoint to prevent abuse
- **Connection Pooling**: Database connections are pooled for efficiency
- **Async Processing**: Order matching is asynchronous for better throughput

## Monitoring and Observability

### Health Check Endpoint

**Endpoint**: `GET /api/v1/health`

**Response**:
```json
{
  "status": "healthy",
  "timestamp": 1692345600000,
  "uptime": 86400,
  "version": "1.0.0",
  "services": {
    "redis": "connected",
    "database": "connected",
    "engine": "running"
  }
}
```

### Metrics Endpoint

**Endpoint**: `GET /api/v1/metrics`

**Response**:
```json
{
  "orders_created_total": 15420,
  "orders_cancelled_total": 1250,
  "trades_executed_total": 12300,
  "active_connections": 145,
  "average_latency_ms": 12.5,
  "error_rate_percent": 0.02
}
```

---

This API specification provides a complete reference for integrating with the trading platform. For real-time data, use the WebSocket API documented separately.