# Complete Frontend Application Specification

## Overview

The frontend is a modern React-based trading interface built with Next.js, providing a responsive and real-time cryptocurrency trading experience. It features advanced charting, order book visualization, and seamless WebSocket integration for live market data.

**Technology Stack**:
- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Lightweight Charts (TradingView)
- **HTTP Client**: Axios
- **Real-time**: WebSocket integration
- **State Management**: React Hooks

## Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Application                     │
├─────────────────────────────────────────────────────────────┤
│  Pages                │  Components              │ Utils    │
│  - Home               │  - TradeView             │ - HTTP   │
│  - Markets            │  - Depth                 │ - WS     │
│  - Trade              │  - SwapUI                │ - Charts │
│                       │  - MarketBar             │ - Types  │
└─────────────────────────────────────────────────────────────┘
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   API Service   │   │  WebSocket WS   │   │  Chart Provider │
│  (REST calls)   │   │ (Live updates)  │   │ (TradingView)   │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

## Project Structure

```
frontend/
├── app/
│   ├── components/           # Reusable components
│   │   ├── core/            # Basic UI components
│   │   │   └── Button.tsx
│   │   ├── depth/           # Order book components
│   │   │   ├── Depth.tsx
│   │   │   ├── BidTable.tsx
│   │   │   └── AskTable.tsx
│   │   ├── Appbar.tsx       # Navigation bar
│   │   ├── MarketBar.tsx    # Market statistics
│   │   ├── Markets.tsx      # Market list
│   │   ├── SwapUI.tsx       # Order entry form
│   │   ├── TradeView.tsx    # Chart component
│   │   └── Trades.tsx       # Trade history
│   ├── utils/               # Utility functions
│   │   ├── ChartManager.ts  # Chart management
│   │   ├── SignalingManager.ts # WebSocket manager
│   │   ├── httpClient.ts    # API client
│   │   ├── types.ts         # Type definitions
│   │   └── wsClient.ts      # WebSocket client
│   ├── markets/             # Markets page
│   │   └── page.tsx
│   ├── trade/               # Trading pages
│   │   └── [market]/
│   │       └── page.tsx     # Dynamic trading page
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── public/                  # Static assets
│   ├── sol.webp
│   ├── usdc.webp
│   └── next.svg
├── package.json
├── tailwind.config.ts       # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
└── next.config.mjs         # Next.js configuration
```

## Core Components Deep Dive

### 1. TradeView Component

**Purpose**: Displays interactive candlestick charts using TradingView's Lightweight Charts library.

**Location**: `app/components/TradeView.tsx`

**Key Features**:
- Real-time price chart updates
- Historical OHLCV data display
- Multiple timeframe support
- Responsive design

**Implementation**:
```typescript
export function TradeView({ market }: { market: string }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartManagerRef = useRef<ChartManager>(null);

  useEffect(() => {
    const init = async () => {
      // Fetch historical kline data
      let klineData: KLine[] = [];
      try {
        klineData = await getKlines(
          market, 
          "1h", 
          Math.floor((new Date().getTime() - 1000 * 60 * 60 * 24 * 7) / 1000), 
          Math.floor(new Date().getTime() / 1000)
        );
      } catch (e) {
        console.error('Failed to load chart data:', e);
      }

      // Initialize chart manager
      if (chartRef.current) {
        if (chartManagerRef.current) {
          chartManagerRef.current.destroy();
        }
        
        const chartManager = new ChartManager(
          chartRef.current,
          klineData?.map((x) => ({
            close: parseFloat(x.close),
            high: parseFloat(x.high),
            low: parseFloat(x.low),
            open: parseFloat(x.open),
            timestamp: new Date(x.end),
          })).sort((x, y) => (x.timestamp < y.timestamp ? -1 : 1)) || [],
          {
            background: "#0e0f14",
            color: "white",
          }
        );
        
        chartManagerRef.current = chartManager;
      }
    };
    
    init();
  }, [market, chartRef]);

  return (
    <div 
      ref={chartRef} 
      style={{ height: "520px", width: "100%", marginTop: 4 }}
    />
  );
}
```

**Chart Manager Integration**:
```typescript
// app/utils/ChartManager.ts
export class ChartManager {
  private chart: IChartApi;
  private candleSeries: ISeriesApi<"Candlestick">;

  constructor(
    container: HTMLElement,
    data: CandlestickData[],
    layout: { background: string; color: string }
  ) {
    this.chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { color: layout.background },
        textColor: layout.color,
      },
      grid: {
        vertLines: { color: 'rgba(70, 70, 70, 0.5)' },
        horzLines: { color: 'rgba(70, 70, 70, 0.5)' },
      },
    });

    this.candleSeries = this.chart.addCandlestickSeries();
    this.candleSeries.setData(data);
  }

  public update(data: CandlestickData) {
    this.candleSeries.update(data);
  }

  public destroy() {
    this.chart.remove();
  }
}
```

### 2. Depth Component (Order Book)

**Purpose**: Real-time order book visualization with bid/ask tables and live updates.

**Location**: `app/components/depth/Depth.tsx`

**Key Features**:
- Real-time order book updates via WebSocket
- Incremental updates for performance
- Price level aggregation
- Visual bid/ask separation

**Implementation**:
```typescript
export function Depth({ market }: { market: string }) {
  const [bids, setBids] = useState<[string, string][]>();
  const [asks, setAsks] = useState<[string, string][]>();
  const [price, setPrice] = useState<string>();

  useEffect(() => {
    // Register WebSocket callback for depth updates
    SignalingManager.getInstance().registerCallback(
      "depth", 
      (data: any) => {
        // Update bids with incremental changes
        setBids((originalBids) => {
          const bidsAfterUpdate = [...(originalBids || [])];
          
          // Update existing price levels
          for (let i = 0; i < bidsAfterUpdate.length; i++) {
            for (let j = 0; j < data.bids.length; j++) {
              if (bidsAfterUpdate[i][0] === data.bids[j][0]) {
                bidsAfterUpdate[i][1] = data.bids[j][1];
                // Remove if quantity is 0
                if (Number(bidsAfterUpdate[i][1]) === 0) {
                  bidsAfterUpdate.splice(i, 1);
                }
                break;
              }
            }
          }
          
          // Add new price levels
          for (let j = 0; j < data.bids.length; j++) {
            if (Number(data.bids[j][1]) !== 0 && 
                !bidsAfterUpdate.map(x => x[0]).includes(data.bids[j][0])) {
              bidsAfterUpdate.push(data.bids[j]);
            }
          }
          
          // Sort bids by price descending
          bidsAfterUpdate.sort((x, y) => Number(y[0]) > Number(x[0]) ? -1 : 1);
          return bidsAfterUpdate;
        });

        // Similar logic for asks
        setAsks((originalAsks) => {
          // ... (similar incremental update logic)
        });
      }, 
      `DEPTH-${market}`
    );

    // Subscribe to depth stream
    SignalingManager.getInstance().sendMessage({
      "method": "SUBSCRIBE",
      "params": [`depth@${market}`]
    });

    // Load initial depth data
    getDepth(market).then(d => {
      setBids(d.bids.reverse());
      setAsks(d.asks);
    });

    // Cleanup on unmount
    return () => {
      SignalingManager.getInstance().sendMessage({
        "method": "UNSUBSCRIBE",
        "params": [`depth@${market}`]
      });
      SignalingManager.getInstance().deRegisterCallback("depth", `DEPTH-${market}`);
    };
  }, [market]);

  return (
    <div>
      <TableHeader />
      {asks && <AskTable asks={asks} />}
      {price && <div className="current-price">{price}</div>}
      {bids && <BidTable bids={bids} />}
    </div>
  );
}
```

**Bid/Ask Table Components**:
```typescript
// BidTable.tsx
export function BidTable({ bids }: { bids: [string, string][] }) {
  return (
    <div className="bid-table">
      {bids.slice(0, 10).map(([price, quantity], index) => (
        <div key={index} className="flex justify-between text-green-500">
          <span>{Number(price).toFixed(2)}</span>
          <span>{Number(quantity).toFixed(4)}</span>
          <span>{(Number(price) * Number(quantity)).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

// AskTable.tsx
export function AskTable({ asks }: { asks: [string, string][] }) {
  return (
    <div className="ask-table">
      {asks.slice(0, 10).map(([price, quantity], index) => (
        <div key={index} className="flex justify-between text-red-500">
          <span>{Number(price).toFixed(2)}</span>
          <span>{Number(quantity).toFixed(4)}</span>
          <span>{(Number(price) * Number(quantity)).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
```

### 3. SwapUI Component (Order Entry)

**Purpose**: Order placement interface with buy/sell functionality and order type selection.

**Location**: `app/components/SwapUI.tsx`

**Key Features**:
- Buy/Sell order placement
- Limit and Market order types
- Balance display and validation
- Percentage allocation buttons
- Post-only and IOC order options

**Implementation**:
```typescript
export function SwapUI({ market }: { market: string }) {
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [activeTab, setActiveTab] = useState('buy');
  const [type, setType] = useState('limit');
  const [balance, setBalance] = useState(0);

  const handleOrderSubmit = async () => {
    try {
      const orderData = {
        market,
        price: type === 'limit' ? price : undefined,
        quantity: amount,
        side: activeTab,
        userId: 'user123', // Replace with actual user ID
      };

      const response = await createOrder(orderData);
      
      if (response.success) {
        // Clear form
        setAmount('');
        setPrice('');
        // Show success message
        alert('Order placed successfully!');
      }
    } catch (error) {
      console.error('Order placement failed:', error);
      alert('Order placement failed. Please try again.');
    }
  };

  const setPercentageAmount = (percentage: number) => {
    const maxAmount = balance * (percentage / 100);
    setAmount(maxAmount.toString());
  };

  return (
    <div className="swap-ui">
      {/* Buy/Sell Tabs */}
      <div className="flex flex-row h-[60px]">
        <BuyButton activeTab={activeTab} setActiveTab={setActiveTab} />
        <SellButton activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Order Type Selection */}
      <div className="flex flex-row gap-5">
        <LimitButton type={type} setType={setType} />
        <MarketButton type={type} setType={setType} />
      </div>

      {/* Balance Display */}
      <div className="flex items-center justify-between">
        <p className="text-xs">Available Balance</p>
        <p className="text-xs">{balance.toFixed(2)} USDC</p>
      </div>

      {/* Price Input (for limit orders) */}
      {type === 'limit' && (
        <div className="flex flex-col gap-2">
          <p className="text-xs">Price</p>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="input-field"
            placeholder="0.00"
          />
        </div>
      )}

      {/* Quantity Input */}
      <div className="flex flex-col gap-2">
        <p className="text-xs">Quantity</p>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input-field"
          placeholder="0.00"
        />
      </div>

      {/* Percentage Buttons */}
      <div className="flex gap-3">
        {[25, 50, 75, 100].map(percentage => (
          <button
            key={percentage}
            onClick={() => setPercentageAmount(percentage)}
            className="percentage-button"
          >
            {percentage === 100 ? 'Max' : `${percentage}%`}
          </button>
        ))}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleOrderSubmit}
        className={`submit-button ${activeTab === 'buy' ? 'buy-button' : 'sell-button'}`}
      >
        {activeTab === 'buy' ? 'Buy' : 'Sell'}
      </button>

      {/* Order Options */}
      <div className="flex gap-2">
        <label className="flex items-center">
          <input type="checkbox" /> Post Only
        </label>
        <label className="flex items-center">
          <input type="checkbox" /> IOC
        </label>
      </div>
    </div>
  );
}
```

### 4. SignalingManager (WebSocket Manager)

**Purpose**: Centralized WebSocket connection management for real-time data.

**Location**: `app/utils/SignalingManager.ts`

**Key Features**:
- Singleton pattern for connection management
- Message buffering during connection
- Callback registration system
- Automatic reconnection handling

**Implementation**:
```typescript
export class SignalingManager {
  private ws: WebSocket;
  private static instance: SignalingManager;
  private bufferedMessages: any[] = [];
  private callbacks: any = {};
  private id: number;
  private initialized: boolean = false;

  private constructor() {
    this.ws = new WebSocket(BASE_URL);
    this.bufferedMessages = [];
    this.id = 1;
    this.init();
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new SignalingManager();
    }
    return this.instance;
  }

  init() {
    this.ws.onopen = () => {
      this.initialized = true;
      // Send buffered messages
      this.bufferedMessages.forEach(message => {
        this.ws.send(JSON.stringify(message));
      });
      this.bufferedMessages = [];
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const type = message.data.e;
      
      if (this.callbacks[type]) {
        this.callbacks[type].forEach(({ callback }) => {
          if (type === "depth") {
            const updatedBids = message.data.b;
            const updatedAsks = message.data.a;
            callback({ bids: updatedBids, asks: updatedAsks });
          }
          
          if (type === "ticker") {
            const newTicker = {
              lastPrice: message.data.c,
              high: message.data.h,
              low: message.data.l,
              volume: message.data.v,
              symbol: message.data.s,
            };
            callback(newTicker);
          }
        });
      }
    };

    this.ws.onclose = () => {
      this.initialized = false;
      // Implement reconnection logic
      setTimeout(() => {
        this.init();
      }, 1000);
    };
  }

  sendMessage(message: any) {
    const messageToSend = {
      ...message,
      id: this.id++
    };
    
    if (!this.initialized) {
      this.bufferedMessages.push(messageToSend);
      return;
    }
    
    this.ws.send(JSON.stringify(messageToSend));
  }

  registerCallback(type: string, callback: any, id: string) {
    this.callbacks[type] = this.callbacks[type] || [];
    this.callbacks[type].push({ callback, id });
  }

  deRegisterCallback(type: string, id: string) {
    if (this.callbacks[type]) {
      const index = this.callbacks[type].findIndex(cb => cb.id === id);
      if (index !== -1) {
        this.callbacks[type].splice(index, 1);
      }
    }
  }
}
```

## HTTP Client Implementation

**Purpose**: Centralized API communication layer.

**Location**: `app/utils/httpClient.ts`

```typescript
import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// API Methods
export const createOrder = async (orderData: any) => {
  return apiClient.post('/api/v1/order', orderData);
};

export const cancelOrder = async (orderId: string, market: string) => {
  return apiClient.delete('/api/v1/order', {
    data: { orderId, market }
  });
};

export const getDepth = async (symbol: string) => {
  return apiClient.get(`/api/v1/depth?symbol=${symbol}`);
};

export const getTrades = async (symbol: string, limit: number = 50) => {
  return apiClient.get(`/api/v1/trades?symbol=${symbol}&limit=${limit}`);
};

export const getKlines = async (
  symbol: string,
  interval: string,
  startTime: number,
  endTime: number
) => {
  return apiClient.get(
    `/api/v1/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}`
  );
};

export const getTicker = async (symbol: string) => {
  return apiClient.get(`/api/v1/tickers/24hr?symbol=${symbol}`);
};

export const getBalance = async (userId: string) => {
  return apiClient.get(`/api/v1/balance?userId=${userId}`);
};
```

## Type Definitions

**Location**: `app/utils/types.ts`

```typescript
export interface KLine {
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  timestamp: number;
  end: number;
}

export interface Ticker {
  symbol: string;
  lastPrice: string;
  high: string;
  low: string;
  volume: string;
  quoteVolume: string;
  priceChange: string;
  priceChangePercent: string;
  openPrice: string;
}

export interface Trade {
  id: string;
  price: string;
  quantity: string;
  timestamp: number;
  isBuyerMaker: boolean;
}

export interface OrderBookEntry {
  price: string;
  quantity: string;
}

export interface Depth {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface Order {
  orderId: string;
  market: string;
  side: 'buy' | 'sell';
  price: string;
  quantity: string;
  filled: string;
  status: 'open' | 'filled' | 'cancelled';
  timestamp: number;
}

export interface Balance {
  asset: string;
  available: number;
  locked: number;
  total: number;
}
```

## Page Components

### 1. Home Page

**Location**: `app/page.tsx`

```typescript
export default function Home() {
  const [markets, setMarkets] = useState([]);
  const [tickers, setTickers] = useState({});

  useEffect(() => {
    // Load market data
    loadMarketData();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">Cryptocurrency Exchange</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {markets.map(market => (
          <MarketCard key={market.symbol} market={market} ticker={tickers[market.symbol]} />
        ))}
      </div>
    </div>
  );
}
```

### 2. Trading Page

**Location**: `app/trade/[market]/page.tsx`

```typescript
export default function TradePage({ params }: { params: { market: string } }) {
  const market = params.market.replace('-', '_');

  return (
    <div className="trading-layout">
      <div className="header">
        <MarketBar market={market} />
      </div>
      
      <div className="main-content grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Chart */}
        <div className="lg:col-span-3">
          <TradeView market={market} />
        </div>
        
        {/* Order Entry */}
        <div className="lg:col-span-1">
          <SwapUI market={market} />
        </div>
        
        {/* Order Book */}
        <div className="lg:col-span-1">
          <Depth market={market} />
        </div>
        
        {/* Recent Trades */}
        <div className="lg:col-span-1">
          <Trades market={market} />
        </div>
      </div>
    </div>
  );
}
```

## Styling and Theming

### Tailwind Configuration

**Location**: `tailwind.config.ts`

```typescript
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Trading colors
        green: {
          500: '#22c55e',
          600: '#16a34a',
        },
        red: {
          500: '#ef4444',
          600: '#dc2626',
        },
        // Dark theme
        background: '#0e0f14',
        foreground: '#ffffff',
        muted: '#64748b',
      },
      animation: {
        'price-up': 'flash-green 0.5s ease-in-out',
        'price-down': 'flash-red 0.5s ease-in-out',
      },
    },
  },
  plugins: [],
};
```

### Global Styles

**Location**: `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #0e0f14;
  --foreground: #ffffff;
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: Arial, Helvetica, sans-serif;
}

/* Trading-specific styles */
.price-up {
  color: #22c55e;
  animation: flash-green 0.5s ease-in-out;
}

.price-down {
  color: #ef4444;
  animation: flash-red 0.5s ease-in-out;
}

@keyframes flash-green {
  0%, 100% { background-color: transparent; }
  50% { background-color: rgba(34, 197, 94, 0.2); }
}

@keyframes flash-red {
  0%, 100% { background-color: transparent; }
  50% { background-color: rgba(239, 68, 68, 0.2); }
}

/* Order book styles */
.order-book-row:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.bid-row {
  border-left: 3px solid #22c55e;
}

.ask-row {
  border-left: 3px solid #ef4444;
}

/* Chart container */
.chart-container {
  background: #0e0f14;
  border-radius: 8px;
  padding: 16px;
}

/* Form inputs */
.input-field {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  color: white;
  transition: border-color 0.2s;
}

.input-field:focus {
  outline: none;
  border-color: #3b82f6;
}

/* Buttons */
.submit-button {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s;
}

.buy-button {
  background: #22c55e;
  color: white;
}

.buy-button:hover {
  background: #16a34a;
}

.sell-button {
  background: #ef4444;
  color: white;
}

.sell-button:hover {
  background: #dc2626;
}
```

## Performance Optimizations

### 1. Memoization

```typescript
import { memo, useMemo } from 'react';

export const OrderBookRow = memo(({ price, quantity, total, type }) => {
  const formattedPrice = useMemo(() => Number(price).toFixed(2), [price]);
  const formattedQuantity = useMemo(() => Number(quantity).toFixed(4), [quantity]);
  
  return (
    <div className={`order-book-row ${type}-row`}>
      <span>{formattedPrice}</span>
      <span>{formattedQuantity}</span>
      <span>{total}</span>
    </div>
  );
});
```

### 2. Virtual Scrolling

```typescript
import { FixedSizeList as List } from 'react-window';

export function VirtualOrderBook({ orders }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <OrderBookRow {...orders[index]} />
    </div>
  );

  return (
    <List
      height={400}
      itemCount={orders.length}
      itemSize={24}
    >
      {Row}
    </List>
  );
}
```

### 3. Debounced Updates

```typescript
import { useMemo, useState, useEffect } from 'react';
import { debounce } from 'lodash';

export function useDebounceValue(value: any, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  const debouncedSetter = useMemo(
    () => debounce((newValue) => setDebouncedValue(newValue), delay),
    [delay]
  );

  useEffect(() => {
    debouncedSetter(value);
    return () => debouncedSetter.cancel();
  }, [value, debouncedSetter]);

  return debouncedValue;
}
```

## Error Handling

### Error Boundary

```typescript
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Testing Strategy

### Component Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { SwapUI } from '../components/SwapUI';

describe('SwapUI', () => {
  it('should switch between buy and sell tabs', () => {
    render(<SwapUI market="TATA_INR" />);
    
    const sellButton = screen.getByText('Sell');
    fireEvent.click(sellButton);
    
    expect(sellButton).toHaveClass('active');
  });

  it('should validate price input', () => {
    render(<SwapUI market="TATA_INR" />);
    
    const priceInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(priceInput, { target: { value: 'invalid' } });
    
    expect(screen.getByText('Invalid price')).toBeInTheDocument();
  });
});
```

## Security Considerations

### 1. Input Sanitization

```typescript
export function sanitizeInput(input: string): string {
  return input.replace(/[<>\"']/g, '');
}

export function validateOrderInput(order: any): boolean {
  if (!order.price || !order.quantity) return false;
  if (isNaN(Number(order.price)) || isNaN(Number(order.quantity))) return false;
  if (Number(order.price) <= 0 || Number(order.quantity) <= 0) return false;
  return true;
}
```

### 2. XSS Protection

```typescript
import DOMPurify from 'dompurify';

export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html);
}
```

This comprehensive frontend specification provides a complete foundation for the trading interface with modern React patterns, real-time capabilities, and production-ready features.