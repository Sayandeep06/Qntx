# Comprehensive Cryptocurrency Trading Platform Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Component Deep Dive](#component-deep-dive)
4. [Data Flow](#data-flow)
5. [API Specifications](#api-specifications)
6. [Database Schema](#database-schema)
7. [WebSocket Protocol](#websocket-protocol)
8. [Setup and Installation](#setup-and-installation)
9. [Deployment Guide](#deployment-guide)
10. [Security Considerations](#security-considerations)
11. [Performance Optimization](#performance-optimization)
12. [Troubleshooting](#troubleshooting)
13. [Development Guidelines](#development-guidelines)

## System Overview

This is a comprehensive cryptocurrency trading platform built using a microservices architecture. The system enables real-time trading with features including order matching, market data streaming, user balance management, and market making capabilities.

### Key Features
- **Real-time Order Matching**: High-performance order book engine with sub-millisecond matching
- **WebSocket Streaming**: Live market data, order updates, and trade feeds
- **REST API**: Complete trading API with order management and market data endpoints
- **Market Making**: Automated liquidity provision algorithms
- **Balance Management**: Multi-asset wallet system with available/locked balance tracking
- **Persistent State**: Order book snapshots with crash recovery
- **Real-time Charts**: TradingView integration for advanced charting
- **Responsive UI**: Modern React-based trading interface

### Technology Stack
- **Backend**: Node.js, TypeScript, Express.js
- **Database**: TimescaleDB (PostgreSQL extension for time-series data)
- **Cache/Message Queue**: Redis
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Containerization**: Docker, Docker Compose
- **Testing**: Vitest
- **Real-time Communication**: WebSockets, Server-Sent Events

## Architecture

The system follows a microservices architecture with the following components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Frontend     │    │   API Gateway   │    │  Engine (Core)  │
│   (Next.js)     │◄──►│   (Express)     │◄──►│  Order Matcher  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebSocket     │    │   Database      │    │     Redis       │
│    Service      │    │  (TimescaleDB)  │    │ (Cache/Queue)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐                      ┌─────────────────┐
│  Market Maker   │                      │   Monitoring    │
│   (Optional)    │                      │   & Logging     │
└─────────────────┘                      └─────────────────┘
```

### Service Communication
1. **HTTP REST**: Client-to-API and internal service communication
2. **Redis Pub/Sub**: Real-time event broadcasting
3. **Redis Queue**: Asynchronous message processing
4. **WebSocket**: Real-time client updates

## Component Deep Dive

### 1. Engine (Core Trading Engine)

**Location**: `/engine/`
**Purpose**: Core order matching and trade execution engine

#### Key Files:
- `src/index.ts`: Main entry point and Redis message consumer
- `src/trade/Engine.ts`: Core trading engine logic
- `src/trade/Orderbook.ts`: Order book implementation
- `src/RedisManager.ts`: Redis connection and message handling
- `src/types/`: TypeScript type definitions

#### Core Classes:

##### Engine Class (`src/trade/Engine.ts`)
The Engine class is the heart of the trading system, responsible for:

**Properties:**
- `orderbooks: Orderbook[]` - Array of trading pair order books
- `balances: Map<string, UserBalance>` - User balance tracking

**Key Methods:**
1. **`process(message, clientId)`** - Main message processor
   - Handles CREATE_ORDER, CANCEL_ORDER, GET_DEPTH, GET_OPEN_ORDERS, ON_RAMP
   - Routes messages to appropriate handlers
   - Sends responses via Redis

2. **`createOrder(market, price, quantity, side, userId)`** - Order creation
   - Validates user balances
   - Locks required funds
   - Adds order to order book
   - Processes fills and updates balances
   - Publishes updates to database and WebSocket clients

3. **`checkAndLockFunds()`** - Balance validation and locking
   - For buy orders: locks quote asset (e.g., INR)
   - For sell orders: locks base asset (e.g., TATA)

4. **`updateBalance()`** - Post-trade balance updates
   - Updates available/locked balances for both parties
   - Handles both buy and sell side updates

5. **`saveSnapshot()`** - Persistence mechanism
   - Saves order book state and balances to JSON file
   - Runs every 3 seconds for crash recovery

##### Orderbook Class (`src/trade/Orderbook.ts`)
Manages individual trading pair order books:

**Properties:**
- `bids: Order[]` - Buy orders (price descending)
- `asks: Order[]` - Sell orders (price ascending)
- `baseAsset: string` - Base currency (e.g., "TATA")
- `quoteAsset: string` - Quote currency (default: "INR")
- `lastTradeId: number` - Incrementing trade ID
- `currentPrice: number` - Last trade price

**Key Methods:**
1. **`addOrder(order)`** - Order matching engine
   - Attempts to match incoming order against opposite side
   - Returns executed quantity and fills
   - Adds remaining quantity to order book

2. **`matchBid(order)`** - Buy order matching
   - Matches against asks (sell orders)
   - Fills at ask prices (price improvement for buyer)

3. **`matchAsk(order)`** - Sell order matching
   - Matches against bids (buy orders)
   - Fills at bid prices (price improvement for seller)

4. **`getDepth()`** - Order book depth aggregation
   - Aggregates orders by price level
   - Returns bid/ask depth for market data

5. **`cancelBid()/cancelAsk()`** - Order cancellation
   - Removes order from order book
   - Returns price level for depth updates

#### Message Flow:
```
API Request → Redis Queue → Engine.process() → Orderbook → Response via Redis
```

#### Balance Management:
- **Available Balance**: Funds available for trading
- **Locked Balance**: Funds reserved for open orders
- **On-Ramp**: Adding funds to user accounts

### 2. API Service

**Location**: `/api/`
**Purpose**: REST API gateway for trading operations

#### Key Files:
- `src/index.ts`: Express server setup and route registration
- `src/routes/order.ts`: Order management endpoints
- `src/routes/depth.ts`: Market depth endpoints
- `src/routes/trades.ts`: Trade history endpoints
- `src/routes/kline.ts`: Candlestick data endpoints
- `src/routes/ticker.ts`: Market ticker endpoints
- `src/RedisManager.ts`: Redis communication layer

#### API Endpoints:

##### Order Management (`/api/v1/order`)
1. **POST `/order`** - Create new order
   ```json
   {
     "market": "TATA_INR",
     "price": "100.50",
     "quantity": "10",
     "side": "buy",
     "userId": "user123"
   }
   ```

2. **DELETE `/order`** - Cancel order
   ```json
   {
     "orderId": "abc123",
     "market": "TATA_INR"
   }
   ```

3. **GET `/openOrders`** - Get open orders
   ```
   ?market=TATA_INR&userId=user123
   ```

##### Market Data (`/api/v1/depth`)
1. **GET `/depth`** - Order book depth
   ```
   ?symbol=TATA_INR
   ```
   Response:
   ```json
   {
     "bids": [["100.50", "150"], ["100.25", "200"]],
     "asks": [["100.75", "100"], ["101.00", "250"]]
   }
   ```

##### Trade History (`/api/v1/trades`)
1. **GET `/trades`** - Recent trades
   ```
   ?symbol=TATA_INR
   ```

##### Market Tickers (`/api/v1/tickers`)
1. **GET `/ticker/24hr`** - 24h ticker statistics
   ```
   ?symbol=TATA_INR
   ```

#### Redis Communication:
The API service communicates with the Engine via Redis:
1. **Request Pattern**: API → Redis Queue → Engine
2. **Response Pattern**: Engine → Redis Queue → API
3. **Correlation**: Uses client ID for request/response matching

### 3. Database Service

**Location**: `/db/`
**Purpose**: Data persistence and historical data management

#### Key Components:
1. **TimescaleDB**: Time-series optimized PostgreSQL
2. **Data Models**: Orders, trades, users, balances
3. **Cron Jobs**: Data aggregation and cleanup

#### Database Schema:

##### Users Table
```sql
CREATE TABLE users (
    id VARCHAR PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    password VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

##### Markets Table
```sql
CREATE TABLE markets (
    symbol VARCHAR PRIMARY KEY,
    base_asset VARCHAR NOT NULL,
    quote_asset VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT true
);
```

##### Orders Table
```sql
CREATE TABLE orders (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR REFERENCES users(id),
    market VARCHAR REFERENCES markets(symbol),
    price DECIMAL(20,8) NOT NULL,
    quantity DECIMAL(20,8) NOT NULL,
    filled DECIMAL(20,8) DEFAULT 0,
    side VARCHAR CHECK (side IN ('buy', 'sell')),
    status VARCHAR DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW()
);
```

##### Trades Table (Hypertable)
```sql
CREATE TABLE trades (
    id VARCHAR PRIMARY KEY,
    market VARCHAR NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    quantity DECIMAL(20,8) NOT NULL,
    buyer_id VARCHAR NOT NULL,
    seller_id VARCHAR NOT NULL,
    is_buyer_maker BOOLEAN,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('trades', 'timestamp');
```

##### Balances Table
```sql
CREATE TABLE balances (
    user_id VARCHAR,
    asset VARCHAR,
    available DECIMAL(20,8) DEFAULT 0,
    locked DECIMAL(20,8) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, asset)
);
```

#### Data Processing:
1. **Real-time Updates**: Via Redis messages from Engine
2. **Aggregations**: Hourly/daily OHLCV calculations
3. **Cleanup**: Old data archival and compression

### 4. WebSocket Service

**Location**: `/ws/`
**Purpose**: Real-time data streaming to clients

#### Key Files:
- `src/index.ts`: WebSocket server setup
- `src/UserManager.ts`: Connection management
- `src/SubscriptionManager.ts`: Subscription handling
- `src/User.ts`: Individual user connection handling

#### Supported Streams:
1. **Depth Stream**: `depth@SYMBOL`
   - Real-time order book updates
   - Incremental updates for efficiency

2. **Trade Stream**: `trade@SYMBOL`
   - Real-time trade execution data
   - Trade price, quantity, timestamp

3. **Ticker Stream**: `ticker@SYMBOL`
   - 24h rolling statistics
   - Price change, volume, high/low

#### Message Format:
```json
{
  "stream": "depth@TATA_INR",
  "data": {
    "e": "depth",
    "s": "TATA_INR",
    "b": [["100.50", "150"]],
    "a": [["100.75", "100"]]
  }
}
```

#### Connection Management:
1. **Authentication**: User ID based (simplified)
2. **Subscriptions**: Dynamic subscription management
3. **Heartbeat**: Connection health monitoring
4. **Error Handling**: Graceful disconnection and reconnection

### 5. Frontend Application

**Location**: `/frontend/`
**Purpose**: Trading interface and user experience

#### Key Components:

##### Pages:
- `/`: Market overview and summary
- `/markets`: All available trading pairs
- `/trade/[market]`: Trading interface for specific pair

##### Components:
1. **TradeView**: Main trading interface
   - Order book display
   - Price chart (TradingView)
   - Order entry form
   - Recent trades

2. **Depth**: Order book visualization
   - BidTable: Buy orders
   - AskTable: Sell orders
   - Aggregated by price level

3. **MarketBar**: Market statistics
   - Current price
   - 24h change
   - Volume

4. **SwapUI**: Order entry interface
   - Buy/sell toggle
   - Price and quantity inputs
   - Balance display

#### Real-time Features:
1. **WebSocket Integration**: Live price and order book updates
2. **Chart Integration**: TradingView charts with real-time data
3. **Order Management**: Real-time order status updates

#### State Management:
- React hooks for local state
- WebSocket integration for real-time updates
- HTTP client for API interactions

### 6. Market Maker (Optional)

**Location**: `/mm/`
**Purpose**: Automated liquidity provision

#### Strategy:
1. **Grid Trading**: Places buy/sell orders at regular intervals
2. **Spread Management**: Maintains bid-ask spread
3. **Risk Management**: Position and exposure limits

#### Configuration:
- Price levels and quantities
- Spread parameters
- Risk limits

## Data Flow

### Order Placement Flow:
```
1. User submits order via Frontend
2. Frontend sends HTTP POST to API
3. API validates and queues message to Redis
4. Engine processes order from Redis queue
5. Engine matches order against order book
6. Engine updates balances and order book
7. Engine publishes updates to:
   - Database (via Redis)
   - WebSocket clients (via Redis)
8. API receives response from Engine
9. Frontend receives HTTP response
10. WebSocket clients receive real-time updates
```

### Market Data Flow:
```
1. Engine processes trades and order book changes
2. Engine publishes depth/trade updates to Redis
3. WebSocket service consumes Redis messages
4. WebSocket service broadcasts to subscribed clients
5. Frontend receives and displays real-time updates
```

## API Specifications

### Authentication
Currently using simplified user ID based authentication. In production, implement:
- JWT tokens
- API key authentication
- Rate limiting
- Request signing

### Rate Limits
Recommended limits:
- Order placement: 10 requests/second
- Market data: 100 requests/second
- WebSocket connections: 5 per user

### Error Responses
```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient funds for order",
    "details": {
      "required": "1000.00",
      "available": "500.00"
    }
  }
}
```

## Setup and Installation

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Git

### Quick Start
1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd week-30-orderbook-1/week-2
   ```

2. **Start Infrastructure**
   ```bash
   cd docker
   docker-compose up -d
   ```

3. **Install Dependencies**
   ```bash
   # Engine
   cd engine
   npm install
   
   # API
   cd ../api
   npm install
   
   # WebSocket
   cd ../ws
   npm install
   
   # Database
   cd ../db
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   
   # Market Maker (optional)
   cd ../mm
   npm install
   ```

4. **Build Services**
   ```bash
   # Build all TypeScript services
   cd engine && npm run build
   cd ../api && npm run build
   cd ../ws && npm run build
   cd ../db && npm run build
   ```

5. **Initialize Database**
   ```bash
   cd db
   npm run seed-db
   ```

6. **Start Services**
   ```bash
   # Terminal 1: Engine
   cd engine
   npm run dev
   
   # Terminal 2: API
   cd api
   npm run dev
   
   # Terminal 3: WebSocket
   cd ws
   npm run dev
   
   # Terminal 4: Database Service
   cd db
   npm run dev
   
   # Terminal 5: Frontend
   cd frontend
   npm run dev
   
   # Terminal 6: Market Maker (optional)
   cd mm
   npm run dev
   ```

### Environment Variables
Create `.env` files in each service directory:

#### Engine (.env)
```
REDIS_URL=redis://localhost:6379
WITH_SNAPSHOT=true
LOG_LEVEL=info
```

#### API (.env)
```
REDIS_URL=redis://localhost:6379
PORT=3000
CORS_ORIGIN=http://localhost:3001
```

#### Database (.env)
```
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/my_database
REDIS_URL=redis://localhost:6379
```

#### WebSocket (.env)
```
REDIS_URL=redis://localhost:6379
WS_PORT=8080
```

#### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

### Docker Setup
For containerized deployment:

```yaml
# docker-compose.yml
version: '3.8'
services:
  engine:
    build: ./engine
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      
  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      
  ws:
    build: ./ws
    ports:
      - "8080:8080"
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      
  frontend:
    build: ./frontend
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000
      - NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

## Performance Optimization

### Engine Optimizations
1. **Order Book Efficiency**
   - Use binary heaps for price-time priority
   - Implement price level aggregation
   - Optimize depth calculation

2. **Memory Management**
   - Order pooling to reduce GC pressure
   - Efficient data structures
   - Memory leak prevention

3. **Persistence**
   - Incremental snapshots
   - Write-ahead logging
   - Compressed storage

### Database Optimizations
1. **Indexing Strategy**
   ```sql
   CREATE INDEX idx_trades_market_time ON trades (market, timestamp);
   CREATE INDEX idx_orders_user_market ON orders (user_id, market);
   CREATE INDEX idx_trades_timestamp ON trades (timestamp);
   ```

2. **Partitioning**
   - Time-based partitioning for trades
   - Market-based partitioning for orders

3. **Caching**
   - Redis caching for frequent queries
   - Application-level caching
   - CDN for static assets

### WebSocket Optimizations
1. **Connection Management**
   - Connection pooling
   - Efficient subscription management
   - Message batching

2. **Data Compression**
   - JSON compression
   - Binary protocols (protobuf)
   - Incremental updates

## Security Considerations

### Authentication & Authorization
1. **API Security**
   - JWT token authentication
   - API key management
   - Request rate limiting
   - IP whitelisting

2. **Data Protection**
   - Input validation and sanitization
   - SQL injection prevention
   - XSS protection
   - CORS configuration

### Infrastructure Security
1. **Network Security**
   - TLS/SSL encryption
   - VPN for internal communication
   - Firewall configuration

2. **Database Security**
   - Encrypted connections
   - Access control
   - Audit logging

### Operational Security
1. **Monitoring**
   - Real-time alerting
   - Anomaly detection
   - Performance monitoring

2. **Backup & Recovery**
   - Automated backups
   - Disaster recovery plans
   - Data integrity checks

## Testing Strategy

### Unit Testing
```bash
# Engine tests
cd engine
npm test

# API tests
cd api
npm test
```

### Integration Testing
1. **End-to-End Order Flow**
2. **WebSocket Communication**
3. **Database Consistency**

### Load Testing
1. **Order Throughput**: Target 10,000+ orders/second
2. **Concurrent Users**: 1,000+ active traders
3. **WebSocket Connections**: 10,000+ concurrent

### Test Scenarios
```javascript
// Example order flow test
describe('Order Flow', () => {
  it('should create and match orders correctly', async () => {
    // Place buy order
    const buyOrder = await api.createOrder({
      market: 'TATA_INR',
      side: 'buy',
      price: '100.00',
      quantity: '10',
      userId: 'user1'
    });
    
    // Place matching sell order
    const sellOrder = await api.createOrder({
      market: 'TATA_INR',
      side: 'sell',
      price: '100.00',
      quantity: '5',
      userId: 'user2'
    });
    
    // Verify fill
    expect(buyOrder.executedQty).toBe(5);
    expect(sellOrder.executedQty).toBe(5);
  });
});
```

## Monitoring and Observability

### Metrics Collection
1. **Trading Metrics**
   - Order latency
   - Match rate
   - Fill ratio
   - Volume metrics

2. **System Metrics**
   - CPU/Memory usage
   - Network I/O
   - Database performance
   - Redis metrics

### Logging Strategy
```javascript
// Structured logging example
logger.info('Order matched', {
  orderId: order.orderId,
  market: order.market,
  price: order.price,
  quantity: order.quantity,
  latency: Date.now() - order.timestamp
});
```

### Alerting
1. **Critical Alerts**
   - Service downtime
   - Database errors
   - Memory leaks

2. **Performance Alerts**
   - High latency
   - Low throughput
   - Error rate spikes

## Troubleshooting

### Common Issues

#### Engine Not Processing Orders
1. **Check Redis Connection**
   ```bash
   redis-cli ping
   ```

2. **Verify Message Queue**
   ```bash
   redis-cli llen messages
   ```

3. **Check Engine Logs**
   ```bash
   cd engine
   npm run dev
   ```

#### WebSocket Connection Issues
1. **Verify Service Status**
   ```bash
   curl http://localhost:8080/health
   ```

2. **Check Subscription Status**
   ```javascript
   // Frontend debugging
   console.log('WebSocket state:', ws.readyState);
   ```

#### Database Connection Problems
1. **Test Database Connection**
   ```bash
   psql postgresql://your_user:your_password@localhost:5432/my_database
   ```

2. **Check TimescaleDB Extension**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'timescaledb';
   ```

### Performance Issues

#### High Latency
1. **Check System Resources**
   ```bash
   top
   htop
   iostat
   ```

2. **Analyze Order Book Size**
   ```javascript
   // Check order book depth
   console.log('Bids:', orderbook.bids.length);
   console.log('Asks:', orderbook.asks.length);
   ```

#### Memory Leaks
1. **Monitor Node.js Memory**
   ```bash
   node --inspect engine/dist/index.js
   ```

2. **Use Memory Profiling**
   ```javascript
   process.memoryUsage();
   ```

## Development Guidelines

### Code Style
1. **TypeScript Usage**
   - Strict type checking
   - Interface definitions
   - Generic types

2. **Error Handling**
   ```javascript
   try {
     const result = await riskyOperation();
     return { success: true, data: result };
   } catch (error) {
     logger.error('Operation failed', { error: error.message });
     return { success: false, error: error.message };
   }
   ```

### Git Workflow
1. **Branch Strategy**
   - `main`: Production code
   - `develop`: Integration branch
   - `feature/*`: Feature branches

2. **Commit Messages**
   ```
   feat: add order cancellation endpoint
   fix: resolve WebSocket memory leak
   docs: update API documentation
   test: add order matching tests
   ```

### Documentation
1. **Code Documentation**
   - JSDoc comments
   - Type annotations
   - README files

2. **API Documentation**
   - OpenAPI/Swagger specs
   - Postman collections
   - Example requests/responses

## Future Enhancements

### Short Term (1-3 months)
1. **Enhanced Order Types**
   - Stop-loss orders
   - Take-profit orders
   - Iceberg orders

2. **Advanced UI Features**
   - Order book visualization
   - Trading history
   - Portfolio management

### Medium Term (3-6 months)
1. **Multi-Asset Support**
   - Multiple trading pairs
   - Cross-asset trading
   - Margin trading

2. **Advanced Trading Features**
   - Algorithmic trading
   - Social trading
   - Copy trading

### Long Term (6+ months)
1. **Institutional Features**
   - Prime brokerage
   - White-label solutions
   - API partners

2. **Global Expansion**
   - Multi-region deployment
   - Regulatory compliance
   - Local payment methods

## Conclusion

This cryptocurrency trading platform provides a solid foundation for building a production-ready exchange. The microservices architecture ensures scalability, while the real-time capabilities provide an excellent user experience. The system can handle high-frequency trading scenarios while maintaining data consistency and reliability.

For production deployment, ensure proper security measures, monitoring, and compliance with local regulations. Regular performance testing and optimization will be crucial for handling growing user bases and trading volumes.

The modular design allows for easy enhancement and feature additions, making it suitable for both small-scale operations and enterprise-level deployments.

---

**Last Updated**: August 2025
**Version**: 1.0.0
**Maintainer**: Trading Platform Team