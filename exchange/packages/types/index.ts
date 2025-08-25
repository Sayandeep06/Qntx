// Core Domain Types

// Order Types
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'limit' | 'market';
export type OrderStatus = 'open' | 'filled' | 'cancelled' | 'partially_filled';

export interface BaseOrder {
  orderId: string;
  userId: string;
  market: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
}

export interface LimitOrder extends BaseOrder {
  type: 'limit';
  price: string;
  quantity: string;
  filledQuantity: string;
  remainingQuantity: string;
}

export interface MarketOrder extends BaseOrder {
  type: 'market';
  price?: string;
  quantity: string;
  filledQuantity: string;
  averagePrice?: string;
}

export type Order = LimitOrder | MarketOrder;


export interface CreateOrderRequest {
  market: string;
  side: OrderSide;
  type: OrderType;
  quantity: string;
  price?: string;
}

export interface CreateOrderResponse {
  orderId: string;
  status: OrderStatus;
  executedQuantity: string;
  averagePrice?: string;
  fills: Fill[];
  timestamp: number;
}

export interface CancelOrderRequest {
  orderId: string;
  market: string;
}

export interface CancelOrderResponse {
  orderId: string;
  status: OrderStatus;
  remainingQuantity: string;
  timestamp: number;
}


export interface Fill {
  fillId: string;
  tradeId: string;
  orderId: string;
  price: string;
  quantity: string;
  fee: string;
  timestamp: number;
  isMaker: boolean;
}

export interface Trade {
  tradeId: string;
  market: string;
  price: string;
  quantity: string;
  timestamp: number;
  buyerOrderId: string;
  sellerOrderId: string;
  buyerId: string;
  sellerId: string;
}

export type MarketStatus = 'active' | 'inactive';

export interface Market {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: MarketStatus;
  minQuantity: string;
  maxQuantity: string;
  minPrice: string;
  maxPrice: string;
  tickSize: string;
  stepSize: string;
  createdAt: number;
  updatedAt: number;
}


export interface OrderBookEntry {
  price: string;
  quantity: string;
  orderCount: number;
}

export interface Depth {
  market: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: number;
}

export interface User {
  userId: string;
  email: string;
  createdAt: number;
  updatedAt: number;
}

export interface Balance {
  userId: string;
  asset: string;
  available: string;
  locked: string;
  total: string;
  lastUpdated: number;
}

export interface UserBalances {
  userId: string;
  balances: Balance[];
  timestamp: number;
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  timestamp: number;
}

export interface APIError {
  code: string;
  message: string;
}

// Type Guards
export function isLimitOrder(order: Order): order is LimitOrder {
  return order.type === 'limit';
}

export function isMarketOrder(order: Order): order is MarketOrder {
  return order.type === 'market';
}

// Validation helpers
export function isValidOrderSide(side: string): side is OrderSide {
  return side === 'buy' || side === 'sell';
}

export function isValidOrderType(type: string): type is OrderType {
  return ['limit', 'market'].includes(type);
}

export function isValidOrderStatus(status: string): status is OrderStatus {
  return ['open', 'filled', 'cancelled', 'partially_filled'].includes(status);
}

// Constants
export const MAX_PRICE_PRECISION = 8;
export const MAX_QUANTITY_PRECISION = 8;
export const MIN_ORDER_VALUE = '10';
export const MAX_ORDER_VALUE = '1000000';

export const SUPPORTED_ASSETS = [
  'BTC', 'ETH', 'USDT', 'USDC', 'INR'
] as const;

export type SupportedAsset = typeof SUPPORTED_ASSETS[number];


export const CREATE_ORDER = 'CREATE_ORDER';
export const CANCEL_ORDER = 'CANCEL_ORDER';
export const ON_RAMP = 'ON_RAMP';
export const GET_DEPTH = 'GET_DEPTH';
export const GET_OPEN_ORDERS = 'GET_OPEN_ORDERS';
export const GET_BALANCE = 'GET_BALANCE';

// Engine response constants
export const ORDER_CREATED = 'ORDER_CREATED';
export const ORDER_CANCELLED = 'ORDER_CANCELLED';
export const ORDER_UPDATED = 'ORDER_UPDATED';
export const BALANCE_UPDATED = 'BALANCE_UPDATED';
export const DEPTH_UPDATE = 'DEPTH_UPDATE';
export const OPEN_ORDERS_RESPONSE = 'OPEN_ORDERS_RESPONSE';
export const TRADE_EXECUTED = 'TRADE_EXECUTED';
export const BALANCE_RESPONSE = 'BALANCE_RESPONSE';


export const SUBSCRIBE = 'SUBSCRIBE';
export const UNSUBSCRIBE = 'UNSUBSCRIBE';

export type WebSocketMessageFromClient = {
    type: typeof SUBSCRIBE,
    data: {
      markets: string[]  
    }
} | {
    type: typeof UNSUBSCRIBE, 
    data: {
      markets: string[]  
    }
};

// Message Types for Engine Communication
export type MessageToEngine = {
    type: typeof CREATE_ORDER,
    data: {
        market: string,
        price: string,
        quantity: string,
        side: "buy" | "sell",
        userId: string
    }
} | {
    type: typeof CANCEL_ORDER,
    data: {
        orderId: string,
        market: string,
    }
} | {
    type: typeof ON_RAMP,
    data: {
        amount: string,
        userId: string
    }
} | {
    type: typeof GET_DEPTH,
    data: {
        market: string,
    }
} | {
    type: typeof GET_OPEN_ORDERS,
    data: {
        userId: string,
        market: string,
    }
} | {
    type: typeof GET_BALANCE,
    data: {
        userId: string,
    }
};

export type MessageFromEngine = {
    type: typeof ORDER_CREATED,
    data: {
        orderId: string,
        userId: string,
        market: string,
        side: "buy" | "sell",
        price: string,
        quantity: string,
        status: OrderStatus,
        timestamp: number,
        fills?: Fill[]
    }
} | {
    type: typeof ORDER_CANCELLED,
    data: {
        orderId: string,
        userId: string,
        market: string,
        remainingQuantity: string,
        timestamp: number
    }
} | {
    type: typeof ORDER_UPDATED,
    data: {
        orderId: string,
        userId: string,
        market: string,
        status: OrderStatus,
        filledQuantity: string,
        remainingQuantity: string,
        timestamp: number,
        fills: Fill[]
    }
} | {
    type: typeof BALANCE_UPDATED,
    data: {
        userId: string,
        asset: string,
        available: string,
        locked: string,
        total: string,
        timestamp: number
    }
} | {
    type: typeof DEPTH_UPDATE,
    data: Depth
} | {
    type: typeof OPEN_ORDERS_RESPONSE,
    data: {
        userId: string,
        market: string,
        orders: Order[],
        timestamp: number
    }
} | {
    type: typeof TRADE_EXECUTED,
    data: {
        trade: Trade,
        makerOrder: Order,
        takerOrder: Order,
        timestamp: number
    }
} | {
    type: typeof BALANCE_RESPONSE,
    data: {
        userId: string,
        balances: Balance[],
        timestamp: number
    }
};