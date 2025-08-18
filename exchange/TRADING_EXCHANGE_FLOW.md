# Trading Exchange Flow

## Architecture

```
Frontend → API Server → Trading Engine → Database
```

## Order Flow

1. User places order via API
2. API validates order (price, quantity, balance)
3. Engine matches order against order book
4. Trade executes and balances update
5. Market data updates (price, volume)
6. WebSocket broadcasts updates

## Order Types

**Limit Order**: Buy/sell at specific price or better
```typescript
{ type: 'limit', side: 'buy', price: '100', quantity: '10' }
```

**Market Order**: Buy/sell immediately at best available price
```typescript
{ type: 'market', side: 'buy', quantity: '10' }
```

## Order Book

- **Bids**: Buy orders sorted by price (highest first)
- **Asks**: Sell orders sorted by price (lowest first)

## Market Data

**Trades**: Every executed transaction
**Ticker**: 24hr price/volume statistics  
**Depth**: Current order book state

## WebSocket Streams

- `trade@SYMBOL` - Live trades
- `depth@SYMBOL` - Order book updates
- `ticker@SYMBOL` - 24hr statistics

## Example Trade

1. User wants to buy 10 TATA at market price
2. Engine matches against best asks:
   - 5 TATA at ₹100.50
   - 5 TATA at ₹100.75
3. User gets 10 TATA, average price ₹100.625
4. Balances update
5. Market data broadcasts new price/volume

That's it.