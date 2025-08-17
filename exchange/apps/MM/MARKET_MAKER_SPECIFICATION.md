# Market Maker Complete Specification

## Overview

The Market Maker (MM) is an automated trading system that provides liquidity to the exchange by continuously placing buy and sell orders around the current market price. It helps maintain tight bid-ask spreads and ensures there's always liquidity available for traders.

**Technology Stack**:
- **Language**: TypeScript/Node.js
- **HTTP Client**: Axios
- **Strategy**: Grid trading with dynamic pricing
- **Risk Management**: Position limits and exposure controls

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Market Maker                             │
├─────────────────────────────────────────────────────────────┤
│  Strategy Engine      │  Risk Manager      │  API Client   │
│  - Grid Trading       │  - Position Limits │  - Order Mgmt │
│  - Price Discovery    │  - Stop Loss       │  - Market Data│
│  - Spread Management  │  - Max Exposure    │  - Balance    │
└─────────────────────────────────────────────────────────────┘
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   API Service   │   │    Database     │   │   Monitoring    │
│ (Order Execution)│   │  (Trade Data)   │   │   & Alerts      │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

## Core Implementation

### Main Market Maker Class

**Location**: `mm/src/index.ts`

```typescript
import axios from "axios";

interface MarketMakerConfig {
  baseUrl: string;
  totalBids: number;
  totalAsks: number;
  market: string;
  userId: string;
  spreadPercent: number;
  maxOrderSize: number;
  minOrderSize: number;
  priceUpdateInterval: number;
  riskLimits: {
    maxPosition: number;
    maxDrawdown: number;
    dailyLossLimit: number;
  };
}

export class MarketMaker {
  private config: MarketMakerConfig;
  private currentPosition: number = 0;
  private dailyPnL: number = 0;
  private lastPrice: number = 0;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(config: MarketMakerConfig) {
    this.config = config;
  }

  async start() {
    console.log(`Starting Market Maker for ${this.config.market}`);
    this.isRunning = true;
    
    // Initialize with current market state
    await this.initialize();
    
    // Start main trading loop
    this.intervalId = setInterval(() => {
      this.runTradingCycle();
    }, this.config.priceUpdateInterval);
  }

  async stop() {
    console.log('Stopping Market Maker');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    // Cancel all open orders
    await this.cancelAllOrders();
  }

  private async initialize() {
    try {
      // Get current market price
      const marketData = await this.getMarketData();
      this.lastPrice = marketData.lastPrice;
      
      // Load current position
      await this.updatePosition();
      
      console.log(`Initialized: Price=${this.lastPrice}, Position=${this.currentPosition}`);
    } catch (error) {
      console.error('Initialization failed:', error);
      throw error;
    }
  }

  private async runTradingCycle() {
    try {
      if (!this.isRunning) return;

      // Risk checks
      if (!await this.performRiskChecks()) {
        console.log('Risk checks failed, skipping cycle');
        return;
      }

      // Get current market state
      const marketData = await this.getMarketData();
      const openOrders = await this.getOpenOrders();

      // Update internal state
      this.lastPrice = marketData.lastPrice;
      await this.updatePosition();

      // Calculate optimal prices
      const targetPrice = await this.calculateTargetPrice(marketData);
      
      // Cancel orders that are too far from market
      const cancelledBids = await this.cancelOrdersAbovePrice(openOrders, targetPrice);
      const cancelledAsks = await this.cancelOrdersBelowPrice(openOrders, targetPrice);

      // Place new orders to maintain grid
      await this.maintainOrderGrid(targetPrice, openOrders, cancelledBids, cancelledAsks);

      console.log(`Cycle completed: Price=${targetPrice}, Orders=${openOrders.length}`);
      
    } catch (error) {
      console.error('Trading cycle error:', error);
    }
  }

  private async performRiskChecks(): Promise<boolean> {
    // Position limit check
    if (Math.abs(this.currentPosition) > this.config.riskLimits.maxPosition) {
      console.log(`Position limit exceeded: ${this.currentPosition}`);
      return false;
    }

    // Daily loss limit check
    if (this.dailyPnL < -this.config.riskLimits.dailyLossLimit) {
      console.log(`Daily loss limit exceeded: ${this.dailyPnL}`);
      return false;
    }

    // Max drawdown check
    const balance = await this.getBalance();
    const drawdown = this.calculateDrawdown(balance);
    if (drawdown > this.config.riskLimits.maxDrawdown) {
      console.log(`Max drawdown exceeded: ${drawdown}%`);
      return false;
    }

    return true;
  }

  private async calculateTargetPrice(marketData: any): Promise<number> {
    // Use various pricing models
    const lastTradePrice = marketData.lastPrice;
    const midPrice = this.calculateMidPrice(marketData.depth);
    const weightedPrice = this.calculateVWAP(marketData.recentTrades);

    // Weighted average of different price sources
    const targetPrice = (
      lastTradePrice * 0.4 +
      midPrice * 0.4 +
      weightedPrice * 0.2
    );

    return targetPrice;
  }

  private calculateMidPrice(depth: any): number {
    if (!depth.bids.length || !depth.asks.length) {
      return this.lastPrice;
    }

    const bestBid = Number(depth.bids[0][0]);
    const bestAsk = Number(depth.asks[0][0]);
    
    return (bestBid + bestAsk) / 2;
  }

  private calculateVWAP(trades: any[]): number {
    if (!trades.length) return this.lastPrice;

    let totalVolume = 0;
    let totalValue = 0;

    for (const trade of trades.slice(0, 10)) { // Last 10 trades
      const price = Number(trade.price);
      const volume = Number(trade.quantity);
      
      totalValue += price * volume;
      totalVolume += volume;
    }

    return totalVolume > 0 ? totalValue / totalVolume : this.lastPrice;
  }

  private async maintainOrderGrid(
    targetPrice: number, 
    openOrders: any[], 
    cancelledBids: number, 
    cancelledAsks: number
  ) {
    const totalBids = openOrders.filter(o => o.side === 'buy').length;
    const totalAsks = openOrders.filter(o => o.side === 'sell').length;

    let bidsToAdd = this.config.totalBids - totalBids - cancelledBids;
    let asksToAdd = this.config.totalAsks - totalAsks - cancelledAsks;

    // Add buy orders
    while (bidsToAdd > 0) {
      const price = this.generateBidPrice(targetPrice);
      const quantity = this.generateOrderQuantity();
      
      await this.placeOrder('buy', price, quantity);
      bidsToAdd--;
    }

    // Add sell orders
    while (asksToAdd > 0) {
      const price = this.generateAskPrice(targetPrice);
      const quantity = this.generateOrderQuantity();
      
      await this.placeOrder('sell', price, quantity);
      asksToAdd--;
    }
  }

  private generateBidPrice(targetPrice: number): number {
    const spread = targetPrice * (this.config.spreadPercent / 100);
    const randomOffset = (Math.random() - 0.5) * spread * 0.5;
    
    return Number((targetPrice - spread/2 + randomOffset).toFixed(2));
  }

  private generateAskPrice(targetPrice: number): number {
    const spread = targetPrice * (this.config.spreadPercent / 100);
    const randomOffset = (Math.random() - 0.5) * spread * 0.5;
    
    return Number((targetPrice + spread/2 + randomOffset).toFixed(2));
  }

  private generateOrderQuantity(): number {
    const min = this.config.minOrderSize;
    const max = this.config.maxOrderSize;
    
    return Number((Math.random() * (max - min) + min).toFixed(3));
  }

  // API Integration Methods
  private async placeOrder(side: 'buy' | 'sell', price: number, quantity: number) {
    try {
      const response = await axios.post(`${this.config.baseUrl}/api/v1/order`, {
        market: this.config.market,
        price: price.toString(),
        quantity: quantity.toString(),
        side,
        userId: this.config.userId
      });
      
      console.log(`Order placed: ${side} ${quantity} @ ${price}`);
      return response.data;
    } catch (error) {
      console.error('Failed to place order:', error.response?.data || error.message);
      throw error;
    }
  }

  private async getOpenOrders(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/api/v1/order/open?userId=${this.config.userId}&market=${this.config.market}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get open orders:', error);
      return [];
    }
  }

  private async cancelOrder(orderId: string) {
    try {
      await axios.delete(`${this.config.baseUrl}/api/v1/order`, {
        data: {
          orderId,
          market: this.config.market
        }
      });
      console.log(`Order cancelled: ${orderId}`);
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  }

  private async cancelOrdersAbovePrice(orders: any[], price: number): Promise<number> {
    let cancelled = 0;
    const promises = orders
      .filter(o => o.side === 'buy' && (Number(o.price) > price || Math.random() < 0.1))
      .map(async (order) => {
        await this.cancelOrder(order.orderId);
        cancelled++;
      });
    
    await Promise.all(promises);
    return cancelled;
  }

  private async cancelOrdersBelowPrice(orders: any[], price: number): Promise<number> {
    let cancelled = 0;
    const promises = orders
      .filter(o => o.side === 'sell' && (Number(o.price) < price || Math.random() < 0.1))
      .map(async (order) => {
        await this.cancelOrder(order.orderId);
        cancelled++;
      });
    
    await Promise.all(promises);
    return cancelled;
  }

  private async cancelAllOrders() {
    const orders = await this.getOpenOrders();
    const promises = orders.map(order => this.cancelOrder(order.orderId));
    await Promise.all(promises);
    console.log(`Cancelled ${orders.length} orders`);
  }

  private async getMarketData(): Promise<any> {
    try {
      const [depth, trades, ticker] = await Promise.all([
        axios.get(`${this.config.baseUrl}/api/v1/depth?symbol=${this.config.market}`),
        axios.get(`${this.config.baseUrl}/api/v1/trades?symbol=${this.config.market}&limit=50`),
        axios.get(`${this.config.baseUrl}/api/v1/tickers/24hr?symbol=${this.config.market}`)
      ]);

      return {
        depth: depth.data,
        recentTrades: trades.data,
        lastPrice: Number(ticker.data.lastPrice || trades.data[0]?.price || this.lastPrice),
        ticker: ticker.data
      };
    } catch (error) {
      console.error('Failed to get market data:', error);
      return {
        depth: { bids: [], asks: [] },
        recentTrades: [],
        lastPrice: this.lastPrice,
        ticker: null
      };
    }
  }

  private async getBalance(): Promise<any> {
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/api/v1/balance?userId=${this.config.userId}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return {};
    }
  }

  private async updatePosition() {
    const balance = await this.getBalance();
    const [baseAsset] = this.config.market.split('_');
    
    this.currentPosition = balance[baseAsset]?.total || 0;
  }

  private calculateDrawdown(balance: any): number {
    // Calculate percentage drawdown from peak
    const totalValue = Object.values(balance).reduce((sum: number, asset: any) => {
      return sum + (asset.total || 0);
    }, 0);

    // This would need historical peak tracking in a real implementation
    const historicalPeak = totalValue * 1.1; // Simplified
    return ((historicalPeak - totalValue) / historicalPeak) * 100;
  }
}

// Configuration and startup
const defaultConfig: MarketMakerConfig = {
  baseUrl: "http://localhost:3000",
  totalBids: 15,
  totalAsks: 15,
  market: "TATA_INR",
  userId: "5",
  spreadPercent: 0.5, // 0.5% spread
  maxOrderSize: 2.0,
  minOrderSize: 0.1,
  priceUpdateInterval: 1000, // 1 second
  riskLimits: {
    maxPosition: 1000,
    maxDrawdown: 10, // 10%
    dailyLossLimit: 500
  }
};

// Start market maker
async function main() {
  const marketMaker = new MarketMaker(defaultConfig);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await marketMaker.stop();
    process.exit(0);
  });

  try {
    await marketMaker.start();
  } catch (error) {
    console.error('Market maker failed to start:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
```

## Advanced Strategies

### 1. Inventory Management Strategy

```typescript
class InventoryAwareMarketMaker extends MarketMaker {
  private targetInventory: number = 0;
  private inventorySkew: number = 0;

  protected async calculateTargetPrice(marketData: any): Promise<number> {
    const basePrice = await super.calculateTargetPrice(marketData);
    
    // Adjust pricing based on inventory position
    const inventoryAdjustment = this.calculateInventoryAdjustment();
    
    return basePrice + inventoryAdjustment;
  }

  private calculateInventoryAdjustment(): number {
    // Calculate how far we are from target inventory
    this.inventorySkew = this.currentPosition - this.targetInventory;
    
    // Adjust prices to encourage inventory normalization
    // If we have too much, encourage selling by lowering prices
    // If we have too little, encourage buying by raising prices
    const maxAdjustment = this.lastPrice * 0.002; // 0.2% max adjustment
    const normalizedSkew = Math.tanh(this.inventorySkew / 100); // Normalize
    
    return -normalizedSkew * maxAdjustment;
  }

  protected generateBidPrice(targetPrice: number): number {
    const basePrice = super.generateBidPrice(targetPrice);
    
    // If we have too much inventory, be less aggressive on bids
    if (this.inventorySkew > 50) {
      return basePrice * 0.999; // Slightly lower bid
    }
    
    return basePrice;
  }

  protected generateAskPrice(targetPrice: number): number {
    const basePrice = super.generateAskPrice(targetPrice);
    
    // If we have too little inventory, be less aggressive on asks
    if (this.inventorySkew < -50) {
      return basePrice * 1.001; // Slightly higher ask
    }
    
    return basePrice;
  }
}
```

### 2. Volatility-Adaptive Strategy

```typescript
class VolatilityAdaptiveMarketMaker extends MarketMaker {
  private volatilityWindow: number[] = [];
  private currentVolatility: number = 0;

  protected async runTradingCycle() {
    // Update volatility calculation
    await this.updateVolatility();
    
    // Adjust spread based on volatility
    this.adjustSpreadForVolatility();
    
    await super.runTradingCycle();
  }

  private async updateVolatility() {
    const trades = await this.getRecentTrades(20);
    
    if (trades.length < 2) return;
    
    // Calculate price returns
    const returns = [];
    for (let i = 1; i < trades.length; i++) {
      const return_ = Math.log(Number(trades[i].price) / Number(trades[i-1].price));
      returns.push(return_);
    }
    
    // Calculate standard deviation (volatility)
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    this.currentVolatility = Math.sqrt(variance) * Math.sqrt(86400); // Annualized
  }

  private adjustSpreadForVolatility() {
    // Increase spread in high volatility, decrease in low volatility
    const baseSpread = 0.5; // 0.5%
    const volatilityMultiplier = 1 + (this.currentVolatility * 10); // Scale factor
    
    this.config.spreadPercent = Math.min(
      Math.max(baseSpread * volatilityMultiplier, 0.1), // Min 0.1%
      2.0 // Max 2.0%
    );
  }

  private async getRecentTrades(limit: number): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.config.baseUrl}/api/v1/trades?symbol=${this.config.market}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get recent trades:', error);
      return [];
    }
  }
}
```

### 3. Multi-Market Strategy

```typescript
class MultiMarketMaker {
  private marketMakers: Map<string, MarketMaker> = new Map();
  private correlationMatrix: Map<string, Map<string, number>> = new Map();

  constructor(private configs: MarketMakerConfig[]) {
    this.initializeMarketMakers();
  }

  private initializeMarketMakers() {
    for (const config of this.configs) {
      const mm = new MarketMaker(config);
      this.marketMakers.set(config.market, mm);
    }
  }

  async start() {
    // Start all market makers
    const startPromises = Array.from(this.marketMakers.values()).map(mm => mm.start());
    await Promise.all(startPromises);

    // Start correlation monitoring
    setInterval(() => {
      this.updateCorrelations();
    }, 10000); // Update every 10 seconds
  }

  async stop() {
    const stopPromises = Array.from(this.marketMakers.values()).map(mm => mm.stop());
    await Promise.all(stopPromises);
  }

  private async updateCorrelations() {
    const markets = Array.from(this.marketMakers.keys());
    
    for (let i = 0; i < markets.length; i++) {
      for (let j = i + 1; j < markets.length; j++) {
        const correlation = await this.calculateCorrelation(markets[i], markets[j]);
        
        if (!this.correlationMatrix.has(markets[i])) {
          this.correlationMatrix.set(markets[i], new Map());
        }
        
        this.correlationMatrix.get(markets[i])!.set(markets[j], correlation);
      }
    }
  }

  private async calculateCorrelation(market1: string, market2: string): Promise<number> {
    // Fetch recent price data for both markets
    const [data1, data2] = await Promise.all([
      this.getMarketReturns(market1),
      this.getMarketReturns(market2)
    ]);

    if (data1.length < 10 || data2.length < 10) return 0;

    // Calculate correlation coefficient
    return this.pearsonCorrelation(data1.slice(0, 10), data2.slice(0, 10));
  }

  private async getMarketReturns(market: string): Promise<number[]> {
    try {
      const response = await axios.get(`http://localhost:3000/api/v1/trades?symbol=${market}&limit=20`);
      const trades = response.data;
      
      const returns = [];
      for (let i = 1; i < trades.length; i++) {
        const return_ = Math.log(Number(trades[i].price) / Number(trades[i-1].price));
        returns.push(return_);
      }
      
      return returns;
    } catch (error) {
      return [];
    }
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }
}
```

## Risk Management

### 1. Position Limits

```typescript
class RiskManager {
  private positionLimits: Map<string, number> = new Map();
  private stopLossLevels: Map<string, number> = new Map();

  setPositionLimit(market: string, limit: number) {
    this.positionLimits.set(market, limit);
  }

  setStopLoss(market: string, level: number) {
    this.stopLossLevels.set(market, level);
  }

  checkRisk(market: string, currentPosition: number, unrealizedPnL: number): boolean {
    // Position limit check
    const positionLimit = this.positionLimits.get(market) || 1000;
    if (Math.abs(currentPosition) > positionLimit) {
      console.log(`Position limit exceeded for ${market}: ${currentPosition}`);
      return false;
    }

    // Stop loss check
    const stopLoss = this.stopLossLevels.get(market) || -500;
    if (unrealizedPnL < stopLoss) {
      console.log(`Stop loss triggered for ${market}: ${unrealizedPnL}`);
      return false;
    }

    return true;
  }
}
```

### 2. Circuit Breakers

```typescript
class CircuitBreaker {
  private errorCount: number = 0;
  private lastErrorTime: number = 0;
  private isOpen: boolean = false;

  private readonly maxErrors = 5;
  private readonly timeWindow = 60000; // 1 minute
  private readonly cooldownPeriod = 300000; // 5 minutes

  async execute<T>(operation: () => Promise<T>): Promise<T | null> {
    if (this.isOpen) {
      if (Date.now() - this.lastErrorTime > this.cooldownPeriod) {
        this.reset();
      } else {
        console.log('Circuit breaker is OPEN, skipping operation');
        return null;
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onError();
      throw error;
    }
  }

  private onSuccess() {
    this.errorCount = 0;
  }

  private onError() {
    this.errorCount++;
    this.lastErrorTime = Date.now();

    if (this.errorCount >= this.maxErrors) {
      this.isOpen = true;
      console.log('Circuit breaker OPENED due to consecutive errors');
    }
  }

  private reset() {
    this.errorCount = 0;
    this.isOpen = false;
    console.log('Circuit breaker RESET');
  }
}
```

## Monitoring and Analytics

### 1. Performance Metrics

```typescript
class MarketMakerMetrics {
  private trades: any[] = [];
  private orderFillRates: Map<string, number> = new Map();
  private profitLoss: number = 0;

  recordTrade(trade: any) {
    this.trades.push({
      ...trade,
      timestamp: Date.now()
    });

    // Calculate P&L
    this.updatePnL(trade);
  }

  recordOrderFill(orderId: string, fillRate: number) {
    this.orderFillRates.set(orderId, fillRate);
  }

  private updatePnL(trade: any) {
    // Simplified P&L calculation
    if (trade.side === 'sell') {
      this.profitLoss += trade.price * trade.quantity;
    } else {
      this.profitLoss -= trade.price * trade.quantity;
    }
  }

  getMetrics(): any {
    const last24h = this.trades.filter(t => Date.now() - t.timestamp < 86400000);
    
    return {
      totalTrades: this.trades.length,
      trades24h: last24h.length,
      totalPnL: this.profitLoss,
      averageFillRate: this.calculateAverageFillRate(),
      sharpeRatio: this.calculateSharpeRatio(),
      maxDrawdown: this.calculateMaxDrawdown()
    };
  }

  private calculateAverageFillRate(): number {
    const fillRates = Array.from(this.orderFillRates.values());
    return fillRates.length > 0 ? fillRates.reduce((a, b) => a + b, 0) / fillRates.length : 0;
  }

  private calculateSharpeRatio(): number {
    if (this.trades.length < 30) return 0;

    const dailyReturns = this.calculateDailyReturns();
    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const stdDev = Math.sqrt(
      dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length
    );

    return stdDev === 0 ? 0 : avgReturn / stdDev;
  }

  private calculateDailyReturns(): number[] {
    // Group trades by day and calculate daily returns
    const dailyPnL: Map<string, number> = new Map();
    
    for (const trade of this.trades) {
      const day = new Date(trade.timestamp).toDateString();
      const pnl = trade.side === 'sell' ? trade.price * trade.quantity : -trade.price * trade.quantity;
      
      dailyPnL.set(day, (dailyPnL.get(day) || 0) + pnl);
    }

    return Array.from(dailyPnL.values());
  }

  private calculateMaxDrawdown(): number {
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnL = 0;

    for (const trade of this.trades) {
      const pnl = trade.side === 'sell' ? trade.price * trade.quantity : -trade.price * trade.quantity;
      runningPnL += pnl;

      if (runningPnL > peak) {
        peak = runningPnL;
      }

      const drawdown = (peak - runningPnL) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }
}
```

### 2. Alert System

```typescript
class AlertManager {
  private webhookUrl?: string;
  private emailConfig?: any;

  constructor(config: { webhook?: string; email?: any }) {
    this.webhookUrl = config.webhook;
    this.emailConfig = config.email;
  }

  async sendAlert(level: 'info' | 'warning' | 'error', message: string, data?: any) {
    const alert = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      source: 'MarketMaker'
    };

    console.log(`[${level.toUpperCase()}] ${message}`, data);

    // Send to webhook
    if (this.webhookUrl) {
      try {
        await axios.post(this.webhookUrl, alert);
      } catch (error) {
        console.error('Failed to send webhook alert:', error);
      }
    }

    // Send email for critical alerts
    if (level === 'error' && this.emailConfig) {
      await this.sendEmailAlert(alert);
    }
  }

  private async sendEmailAlert(alert: any) {
    // Implementation would depend on email service (SendGrid, SES, etc.)
    console.log('Email alert would be sent:', alert);
  }
}
```

## Configuration Management

### Configuration File Example

```typescript
// config/production.ts
export const productionConfig: MarketMakerConfig = {
  baseUrl: "https://api.exchange.com",
  totalBids: 20,
  totalAsks: 20,
  market: "BTC_USDT",
  userId: "mm_prod_001",
  spreadPercent: 0.1, // Tighter spreads in production
  maxOrderSize: 0.1,
  minOrderSize: 0.01,
  priceUpdateInterval: 500, // Faster updates
  riskLimits: {
    maxPosition: 10,
    maxDrawdown: 5, // More conservative
    dailyLossLimit: 1000
  },
  alerts: {
    webhook: "https://hooks.slack.com/...",
    email: {
      service: "sendgrid",
      apiKey: process.env.SENDGRID_API_KEY
    }
  }
};

// config/development.ts
export const developmentConfig: MarketMakerConfig = {
  baseUrl: "http://localhost:3000",
  totalBids: 5,
  totalAsks: 5,
  market: "TATA_INR",
  userId: "5",
  spreadPercent: 1.0, // Wider spreads for testing
  maxOrderSize: 1.0,
  minOrderSize: 0.1,
  priceUpdateInterval: 2000, // Slower for development
  riskLimits: {
    maxPosition: 100,
    maxDrawdown: 20,
    dailyLossLimit: 100
  }
};
```

## Deployment and Operations

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY config/ ./config/

USER node

CMD ["node", "dist/index.js"]
```

### Kubernetes Deployment

```yaml
# k8s/market-maker.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: market-maker
spec:
  replicas: 1
  selector:
    matchLabels:
      app: market-maker
  template:
    metadata:
      labels:
        app: market-maker
    spec:
      containers:
      - name: market-maker
        image: market-maker:latest
        env:
        - name: NODE_ENV
          value: "production"
        - name: API_URL
          value: "https://api.exchange.com"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

This comprehensive Market Maker specification provides a complete foundation for automated liquidity provision with advanced risk management, multiple strategies, and production-ready monitoring capabilities.