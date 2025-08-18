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

// Order creation requests
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

// Order fills
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

// Trade Types
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

// Market Data Types
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

// Order book
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

// User and Balance Types
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