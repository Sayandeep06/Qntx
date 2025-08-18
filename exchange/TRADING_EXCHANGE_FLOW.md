# Complete Trading Exchange Flow Explanation

## 🏗️ **System Architecture**

```
Frontend (Next.js) → API Server → Trading Engine → Database
                         ↓              ↓
                    WebSocket ← Redis Pub/Sub
```

The Qntx trading platform is built as a microservices architecture with the following components:

- **Frontend**: Next.js React application for user interface
- **API Server**: Express.js REST API for order management
- **Trading Engine**: Core order matching and execution engine
- **WebSocket Service**: Real-time data streaming
- **Database**: TimescaleDB for time-series data storage
- **Redis**: Message queuing and caching layer
- **Market Maker**: Automated liquidity provision

## 📊 **1. Order Placement and Matching Flow**

### **Step 1: Order Creation Process**
```
1. User places order via Frontend
2. Frontend sends to API Server (/api/v1/order)
3. API validates order (price, quantity, balance)
4. API sends message to Trading Engine via Redis
5. Engine processes order and matches it
6. Results flow back through system
```

### **Order Book Structure**
The order book maintains two sides:
- **Bids** (buy orders): Sorted by price DESC (highest first)
- **Asks** (sell orders): Sorted by price ASC (lowest first)

```typescript
interface OrderBook {
  bids: OrderBookEntry[];  // [[price, quantity, orderCount], ...]
  asks: OrderBookEntry[];  // [[price, quantity, orderCount], ...]
  lastUpdateId: number;
  timestamp: number;
}
```

### **Matching Algorithm**
1. **Price-Time Priority**: Best price gets matched first, then by timestamp
2. **Order Types Handling**:
   - **Limit Orders**: Only match at specified price or better
   - **Market Orders**: Match immediately at best available price
   - **Stop Orders**: Trigger when price reaches stop level
   - **Stop-Limit Orders**: Become limit orders when triggered

3. **Trade Execution Process**:
   ```typescript
   // When orders match:
   const trade = {
     tradeId: generateId(),
     price: matchingPrice,
     quantity: matchedQuantity,
     buyerId: buyOrder.userId,
     sellerId: sellOrder.userId,
     buyerOrderId: buyOrder.orderId,
     sellerOrderId: sellOrder.orderId,
     timestamp: Date.now(),
     isBuyerMaker: false // Taker removes liquidity
   }
   ```

### **Order Types Detailed Behavior**

#### **Limit Order**
```typescript
// Example: "Buy 10 TATA at ₹100 max"
{
  type: 'limit',
  side: 'buy',
  price: '100.00',
  quantity: '10',
  // Waits in order book until price ≤ ₹100
}
```

#### **Market Order**
```typescript
// Example: "Buy 10 TATA now at current market price"
{
  type: 'market',
  side: 'buy',
  quantity: '10',
  // Executes immediately against best available asks
  // Price gets set after execution
}
```

#### **Stop Order**
```typescript
// Example: "Sell if TATA price drops to ₹95"
{
  type: 'stop',
  side: 'sell',
  stopPrice: '95.00',
  quantity: '10',
  // Becomes market order when market price hits ₹95
}
```

#### **Stop-Limit Order**
```typescript
// Example: "When TATA hits ₹95, sell at ₹94 limit"
{
  type: 'stop_limit',
  side: 'sell',
  stopPrice: '95.00',    // Trigger price
  limitPrice: '94.00',   // Execution price
  quantity: '10',
  // Becomes limit order at ₹94 when market hits ₹95
}
```

### **Time In Force Options**
- **GTC** (Good Till Cancel): Stays active until manually cancelled
- **IOC** (Immediate or Cancel): Execute immediately or cancel unfilled portion
- **FOK** (Fill or Kill): Execute completely or cancel entirely
- **GTT** (Good Till Time): Active until specified time

## 📈 **2. Market Data Generation**

### **Ticker Generation (24hr Statistics)**
Tickers provide rolling 24-hour market statistics, updated with every trade:

```typescript
interface Ticker {
  symbol: "TATA_INR",
  lastPrice: "100.50",           // Last trade price
  priceChange: "1.50",           // Absolute change from 24h ago
  priceChangePercent: "1.52",    // Percentage change
  weightedAvgPrice: "100.25",    // Volume weighted average price
  prevClosePrice: "99.00",       // Price 24h ago
  bidPrice: "100.25",            // Current best bid
  bidQty: "10.0",               // Best bid quantity
  askPrice: "100.75",            // Current best ask
  askQty: "8.0",                // Best ask quantity
  openPrice: "99.00",            // First price 24h ago
  highPrice: "102.00",           // Highest price in 24h
  lowPrice: "98.50",             // Lowest price in 24h
  volume: "150000",              // Total base asset volume
  quoteVolume: "15075000.00",    // Total quote asset volume
  openTime: 1692259200000,       // 24h window start
  closeTime: 1692345600000,      // Current time
  firstId: "10000",              // First trade ID in window
  lastId: "12500",               // Last trade ID
  count: 2500                    // Number of trades in 24h
}
```

**Ticker Update Process**:
1. Every trade triggers ticker recalculation
2. Rolling 24-hour window maintained in memory
3. WebSocket broadcasts ticker updates to subscribers
4. Database stores historical ticker snapshots

### **Klines/Candlesticks Generation**
OHLCV data for charting across multiple timeframes:

```typescript
interface Kline {
  openTime: 1692345600000,       // Candle start time
  open: "100.00",                // First trade price in period
  high: "101.50",                // Highest trade price in period
  low: "99.75",                  // Lowest trade price in period
  close: "100.50",               // Last trade price in period
  volume: "15000",               // Total base asset volume
  closeTime: 1692349200000,      // Candle end time
  quoteAssetVolume: "1507500.00", // Total quote asset volume
  numberOfTrades: 150,           // Total trades in period
  takerBuyBaseAssetVolume: "7500", // Taker buy volume
  takerBuyQuoteAssetVolume: "753750.00" // Taker buy quote volume
}
```

**Supported Intervals**: `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `6h`, `8h`, `12h`, `1d`, `3d`, `1w`, `1M`

**Kline Generation Process**:
1. **Time Buckets**: Trades grouped by intervals
2. **OHLC Calculation**: 
   - **Open**: First trade price in time bucket
   - **High**: Maximum price in time bucket
   - **Low**: Minimum price in time bucket
   - **Close**: Last trade price in time bucket
3. **Volume Aggregation**: Sum all trade volumes in bucket
4. **Real-time Updates**: Current candle updates with each new trade
5. **Historical Storage**: Completed candles stored in database

## 🔄 **3. WebSocket Real-time Streams**

### **Stream Types and Formats**

#### **Order Book Depth Stream**
```typescript
// Subscribe: depth@TATA_INR
{
  "stream": "depth@TATA_INR",
  "data": {
    "e": "depthUpdate",
    "E": 1692345600000,          // Event time
    "s": "TATA_INR",             // Symbol
    "U": 157,                    // First update ID
    "u": 160,                    // Final update ID
    "b": [                       // Bids to update
      ["100.50", "150"],         // [price, quantity]
      ["100.25", "200"]
    ],
    "a": [                       // Asks to update
      ["100.75", "100"],         // [price, quantity]
      ["101.00", "250"]          // quantity "0" means remove level
    ]
  }
}
```

#### **Trade Stream**
```typescript
// Subscribe: trade@TATA_INR
{
  "stream": "trade@TATA_INR",
  "data": {
    "e": "trade",
    "E": 1692345600000,          // Event time
    "s": "TATA_INR",             // Symbol
    "t": "12345",                // Trade ID
    "p": "100.50",               // Price
    "q": "5.0",                  // Quantity
    "b": "buy_order_id",         // Buyer order ID
    "a": "sell_order_id",        // Seller order ID
    "T": 1692345600000,          // Trade time
    "m": true,                   // Is buyer maker
    "M": false                   // Ignore field
  }
}
```

#### **Ticker Stream**
```typescript
// Subscribe: ticker@TATA_INR
{
  "stream": "ticker@TATA_INR",
  "data": {
    "e": "24hrTicker",
    "E": 1692345600000,          // Event time
    "s": "TATA_INR",             // Symbol
    "p": "1.50",                 // Price change
    "P": "1.52",                 // Price change percent
    "w": "100.25",               // Weighted average price
    "c": "100.50",               // Current close price
    "Q": "5.0",                  // Close quantity
    "b": "100.25",               // Best bid price
    "B": "10.0",                 // Best bid quantity
    "a": "100.75",               // Best ask price
    "A": "8.0",                  // Best ask quantity
    "o": "99.00",                // Open price
    "h": "102.00",               // High price
    "l": "98.50",                // Low price
    "v": "150000",               // Base asset volume
    "q": "15075000.00",          // Quote asset volume
    "n": 2500                    // Trade count
  }
}
```

#### **Kline Stream**
```typescript
// Subscribe: kline_1h@TATA_INR
{
  "stream": "kline_1h@TATA_INR",
  "data": {
    "e": "kline",
    "E": 1692345600000,          // Event time
    "s": "TATA_INR",             // Symbol
    "k": {
      "t": 1692345600000,        // Kline start time
      "T": 1692349200000,        // Kline close time
      "s": "TATA_INR",           // Symbol
      "i": "1h",                 // Interval
      "o": "100.00",             // Open price
      "c": "100.50",             // Close price
      "h": "101.50",             // High price
      "l": "99.75",              // Low price
      "v": "15000",              // Volume
      "n": 150,                  // Number of trades
      "x": false,                // Is kline closed?
      "q": "1507500.00",         // Quote asset volume
      "V": "7500",               // Taker buy base volume
      "Q": "753750.00"           // Taker buy quote volume
    }
  }
}
```

#### **User Data Stream (Private)**
```typescript
// Subscribe: user@user123 (requires authentication)
{
  "stream": "user@user123",
  "data": {
    "e": "executionReport",      // Order update
    "E": 1692345600000,          // Event time
    "s": "TATA_INR",             // Symbol
    "c": "client_order_id",      // Client order ID
    "S": "buy",                  // Side
    "o": "LIMIT",                // Order type
    "f": "GTC",                  // Time in force
    "q": "10.0",                 // Order quantity
    "p": "100.50",               // Order price
    "X": "FILLED",               // Order status
    "i": "abc123def456",         // Order ID
    "l": "5.0",                  // Last executed quantity
    "z": "5.0",                  // Cumulative filled quantity
    "L": "100.50",               // Last executed price
    "n": "0.01",                 // Commission amount
    "N": "INR",                  // Commission asset
    "T": 1692345600000,          // Transaction time
    "t": "12345"                 // Trade ID
  }
}
```

### **WebSocket Subscription Management**

```javascript
// Subscribe to multiple streams
ws.send(JSON.stringify({
  method: 'SUBSCRIBE',
  params: [
    'depth@TATA_INR',
    'trade@TATA_INR',
    'ticker@TATA_INR',
    'kline_1h@TATA_INR'
  ],
  id: 1
}));

// Unsubscribe from streams
ws.send(JSON.stringify({
  method: 'UNSUBSCRIBE',
  params: ['depth@TATA_INR'],
  id: 2
}));

// List active subscriptions
ws.send(JSON.stringify({
  method: 'LIST_SUBSCRIPTIONS',
  id: 3
}));
```

## 📚 **4. Key Exchange Terminology**

### **Trading Concepts**
- **Market/Symbol**: Trading pair (e.g., TATA_INR = TATA stocks priced in Indian Rupees)
- **Base Asset**: Asset being bought/sold (TATA in TATA_INR)
- **Quote Asset**: Asset used for pricing (INR in TATA_INR)
- **Spread**: Difference between best bid and ask price
- **Liquidity**: How easily assets can be bought/sold without affecting price
- **Slippage**: Difference between expected and actual execution price

### **Order Book Terms**
- **Bid**: Buy order (buyer willing to pay this price)
- **Ask/Offer**: Sell order (seller willing to accept this price)
- **Order Book**: List of all pending buy/sell orders
- **Depth**: Number of orders at each price level
- **Level**: Price point with aggregated quantity
- **Spread**: Difference between best bid and best ask
- **Mid Price**: (Best Bid + Best Ask) / 2

### **Order Management**
- **Fill**: Partial or complete execution of an order
- **Maker**: Order that adds liquidity (sits in order book)
- **Taker**: Order that removes liquidity (matches existing order)
- **Post-Only**: Order will only execute as maker, never taker
- **Reduce-Only**: Order can only reduce position size, not increase
- **Self-Trade Prevention**: Prevents user's orders from matching each other

### **Time In Force Types**
- **GTC** (Good Till Cancel): Stays active until manually cancelled
- **IOC** (Immediate or Cancel): Execute immediately or cancel
- **FOK** (Fill or Kill): Execute completely or cancel entirely
- **GTT** (Good Till Time): Active until specified time

### **Balance Types**
- **Available**: Balance available for trading
- **Locked**: Balance tied up in open orders
- **Total**: Available + Locked balance

### **Market Data Terms**
- **OHLCV**: Open, High, Low, Close, Volume - candlestick data
- **VWAP**: Volume Weighted Average Price
- **24hr Ticker**: Statistics for past 24 hours
- **Price Feed**: Real-time price updates
- **Last Price**: Price of most recent trade
- **Mark Price**: Fair value price for risk calculations

### **Market Making Terms**
- **Market Maker**: Entity providing liquidity by placing orders
- **Liquidity Provider**: Same as market maker
- **Grid Trading**: Strategy placing orders at regular price intervals
- **Inventory Management**: Managing asset position size
- **Spread Management**: Controlling bid-ask spread width
- **Arbitrage**: Exploiting price differences between markets

### **Risk Management**
- **Position**: Total holdings of an asset (long or short)
- **Exposure**: Total risk from open positions
- **Drawdown**: Peak-to-trough decline in portfolio value
- **Stop Loss**: Order to limit losses
- **Take Profit**: Order to secure profits
- **Circuit Breaker**: Automatic trading halt on errors
- **Position Limits**: Maximum allowed position size
- **Risk Limits**: Various limits to control trading risk

### **Trading Fees**
- **Maker Fee**: Fee for orders that add liquidity
- **Taker Fee**: Fee for orders that remove liquidity
- **Gas Fee**: Network transaction fee (for blockchain assets)
- **Withdrawal Fee**: Fee for withdrawing assets

## 🔄 **5. Complete Trade Flow Example**

Let's trace a complete order from placement to execution:

### **Example: Market Buy Order**

1. **User Action**: User wants to buy 10 TATA at market price
   ```typescript
   const order = {
     market: "TATA_INR",
     side: "buy",
     type: "market",
     quantity: "10",
     userId: "user123"
   }
   ```

2. **API Validation**: 
   - Check user has sufficient INR balance
   - Validate order format and market status
   - Calculate estimated cost based on current asks

3. **Engine Processing**:
   ```typescript
   // Current order book state
   const orderBook = {
     asks: [
       ["100.50", "5"],    // 5 TATA at ₹100.50
       ["100.75", "8"],    // 8 TATA at ₹100.75
       ["101.00", "10"]    // 10 TATA at ₹101.00
     ]
   }
   ```

4. **Order Matching**:
   - **Trade 1**: Buy 5 TATA at ₹100.50 (fills completely)
   - **Trade 2**: Buy 5 TATA at ₹100.75 (partial fill)
   - **Result**: 10 TATA purchased, average price ₹100.625

5. **Trade Records Created**:
   ```typescript
   const trades = [
     {
       tradeId: "trade_001",
       price: "100.50",
       quantity: "5",
       buyerId: "user123",
       sellerId: "user456",
       timestamp: Date.now(),
       isBuyerMaker: false
     },
     {
       tradeId: "trade_002", 
       price: "100.75",
       quantity: "5",
       buyerId: "user123", 
       sellerId: "user789",
       timestamp: Date.now(),
       isBuyerMaker: false
     }
   ]
   ```

6. **Balance Updates**:
   ```typescript
   // Buyer (user123)
   balances.TATA.available += 10
   balances.INR.available -= 1006.25  // Including fees
   
   // Sellers (user456, user789)  
   balances.INR.available += amounts received
   balances.TATA.available -= amounts sold
   ```

7. **Market Data Updates**:
   - **Last Price**: Updated to ₹100.75
   - **Order Book**: Ask levels updated (5 TATA removed from ₹100.50, 3 TATA remaining at ₹100.75)
   - **24hr Ticker**: Volume, VWAP, high/low potentially updated
   - **Kline**: Current candle updated with new trades

8. **WebSocket Broadcasts**:
   ```typescript
   // Trade stream
   broadcast("trade@TATA_INR", tradeData)
   
   // Depth stream  
   broadcast("depth@TATA_INR", depthUpdate)
   
   // Ticker stream
   broadcast("ticker@TATA_INR", tickerUpdate)
   
   // User streams
   broadcast("user@user123", executionReport)
   broadcast("user@user456", executionReport) 
   broadcast("user@user789", executionReport)
   ```

9. **Database Storage**:
   - Trade records persisted
   - Order status updates  
   - Balance change logs
   - OHLCV data updated

10. **Frontend Updates**:
    - Order history refreshed
    - Portfolio balances updated
    - Charts updated with new trade data
    - Order book display refreshed

## 🤖 **6. Market Maker Integration**

The Market Maker provides automated liquidity:

### **Market Maker Strategy**
1. **Price Discovery**: Analyzes recent trades, order book, and external sources
2. **Grid Placement**: Places buy orders below market, sell orders above market
3. **Inventory Management**: Adjusts strategy based on current asset holdings
4. **Risk Control**: Monitors position limits and stops trading if needed

### **Market Maker Flow**
```typescript
// Every 1 second:
1. Get current market data (price, depth, trades)
2. Calculate target spread and prices  
3. Cancel orders too far from market
4. Place new orders to maintain grid
5. Update risk metrics and position tracking
```

### **Impact on Market**
- **Tighter Spreads**: Reduces difference between bid and ask
- **Consistent Liquidity**: Always orders available for trading
- **Price Stability**: Reduces volatility through continuous presence
- **Volume Generation**: Creates trading activity

## 📊 **7. System Performance Characteristics**

### **Throughput Metrics**
- **Order Processing**: 10,000+ orders/second
- **WebSocket Connections**: 10,000+ concurrent connections  
- **Trade Matching**: Sub-millisecond order matching
- **Market Data Updates**: Real-time with <10ms latency

### **Scalability Features**
- **Horizontal Scaling**: Multiple API servers behind load balancer
- **Database Partitioning**: TimescaleDB for time-series data
- **Caching**: Redis for frequently accessed data
- **Message Queuing**: Redis pub/sub for service communication

## 🔐 **8. Security and Risk Controls**

### **Order Validation**
- Balance verification before order placement
- Price and quantity range checks
- Rate limiting per user
- Market status verification

### **Risk Management**
- Position limits per user and market
- Daily loss limits
- Circuit breakers for abnormal activity
- Self-trade prevention

### **Security Measures**
- API key authentication
- Request signature validation
- Rate limiting and DDoS protection
- Input sanitization and validation

---

This comprehensive trading exchange system provides a complete end-to-end solution for cryptocurrency and stock trading, with real-time market data, automated market making, and robust risk management. Every component works together to create a seamless trading experience while maintaining security and performance at scale.