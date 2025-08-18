// Core Domain Types

// Order Types
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'limit' | 'market' | 'stop' | 'stop_limit';
export type OrderStatus = 'open' | 'filled' | 'cancelled' | 'rejected' | 'partially_filled';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'GTT';

export interface BaseOrder {
  orderId: string;
  userId: string;
  market: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  timeInForce: TimeInForce;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

export interface LimitOrder extends BaseOrder {
  type: 'limit';
  price: string; // Decimal string for precision
  quantity: string; // Decimal string for precision
  filledQuantity: string;
  remainingQuantity: string;
}

export interface MarketOrder extends BaseOrder {
  type: 'market';
  price?: string; // Executed price, set after execution
  quantity: string;
  filledQuantity: string;
  averagePrice?: string; // Set after execution
}

export interface StopOrder extends BaseOrder {
  type: 'stop';
  stopPrice: string;
  quantity: string;
  filledQuantity: string;
}

export interface StopLimitOrder extends BaseOrder {
  type: 'stop_limit';
  stopPrice: string;
  limitPrice: string;
  quantity: string;
  filledQuantity: string;
}

export type Order = LimitOrder | MarketOrder | StopOrder | StopLimitOrder;

// Order creation requests
export interface CreateOrderRequest {
  market: string;
  side: OrderSide;
  type: OrderType;
  quantity: string;
  price?: string; // Required for limit orders
  stopPrice?: string; // Required for stop orders
  timeInForce?: TimeInForce;
  postOnly?: boolean;
  reduceOnly?: boolean;
  clientOrderId?: string;
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
  orderId?: string;
  clientOrderId?: string;
  market: string;
}

export interface CancelOrderResponse {
  orderId: string;
  status: OrderStatus;
  remainingQuantity: string;
  timestamp: number;
}

// Order book entry
export interface OrderBookEntry {
  price: string;
  quantity: string;
  orderCount: number;
}

// Order fills
export interface Fill {
  fillId: string;
  tradeId: string;
  orderId: string;
  price: string;
  quantity: string;
  fee: string;
  feeAsset: string;
  timestamp: number;
  isMaker: boolean;
  counterOrderId: string;
  counterUserId: string;
}

// Trade Types
export interface Trade {
  tradeId: string;
  market: string;
  price: string;
  quantity: string;
  quoteQuantity: string;
  timestamp: number;
  isBuyerMaker: boolean;
  buyerOrderId: string;
  sellerOrderId: string;
  buyerId: string;
  sellerId: string;
  buyerFee: string;
  sellerFee: string;
  feeAsset: string;
}

export interface TradeHistory {
  trades: Trade[];
  totalCount: number;
  hasMore: boolean;
}

export interface TradeRequest {
  market: string;
  limit?: number;
  fromId?: string;
  startTime?: number;
  endTime?: number;
}

// Aggregated trade data
export interface TradeStats {
  market: string;
  volume24h: string;
  quoteVolume24h: string;
  tradeCount24h: number;
  high24h: string;
  low24h: string;
  priceChange24h: string;
  priceChangePercent24h: string;
  lastPrice: string;
  lastQuantity: string;
  lastTradeTime: number;
}

// Market Data Types
export type MarketStatus = 'active' | 'inactive' | 'delisted' | 'maintenance';

export interface TradingFees {
  makerFee: string; // Decimal string (e.g., "0.001" for 0.1%)
  takerFee: string;
  makerFeeDiscount?: string;
  takerFeeDiscount?: string;
}

export interface Market {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: MarketStatus;
  baseAssetPrecision: number;
  quoteAssetPrecision: number;
  minQuantity: string;
  maxQuantity: string;
  minPrice: string;
  maxPrice: string;
  tickSize: string;
  stepSize: string;
  minNotional: string;
  fees: TradingFees;
  createdAt: number;
  updatedAt: number;
}

// Order book depth
export interface Depth {
  market: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: number;
  lastUpdateId: number;
}

export interface DepthRequest {
  market: string;
  limit?: number; // Default 100, max 1000
}

// Ticker data
export interface Ticker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: string;
  lastId: string;
  count: number;
}

// Kline/Candlestick data
export type KlineInterval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M';

export interface Kline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
}

export interface KlineRequest {
  symbol: string;
  interval: KlineInterval;
  startTime?: number;
  endTime?: number;
  limit?: number; // Default 500, max 1000
}

// User and Balance Types
export type KYCStatus = 'pending' | 'approved' | 'rejected' | 'requires_update';
export type AccountStatus = 'active' | 'suspended' | 'closed' | 'pending_verification';

export interface User {
  userId: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  kycStatus: KYCStatus;
  accountStatus: AccountStatus;
  twoFactorEnabled: boolean;
  apiKeyEnabled: boolean;
  tradingEnabled: boolean;
  withdrawalEnabled: boolean;
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
}

// Balance types
export interface Balance {
  userId: string;
  asset: string;
  available: string; // Available for trading
  locked: string; // Locked in orders
  total: string; // available + locked
  lastUpdated: number;
}

export interface BalanceUpdate {
  userId: string;
  asset: string;
  balanceType: 'available' | 'locked';
  amount: string; // Can be negative for deductions
  referenceId?: string; // Order ID, trade ID, etc.
  referenceType: 'order' | 'trade' | 'deposit' | 'withdrawal' | 'fee' | 'adjustment';
  description?: string;
}

export interface UserBalances {
  userId: string;
  balances: Balance[];
  timestamp: number;
}

// Account operations
export interface DepositRequest {
  userId: string;
  asset: string;
  amount: string;
  network?: string;
  address?: string;
  txHash?: string;
}

export interface WithdrawalRequest {
  userId: string;
  asset: string;
  amount: string;
  address: string;
  network?: string;
  tag?: string;
  twoFactorCode?: string;
}

export interface TransactionHistory {
  transactionId: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'trade' | 'fee';
  asset: string;
  amount: string;
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  txHash?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  createdAt: number;
  updatedAt: number;
}

// WebSocket Message Types
// Base WebSocket message structure
export interface WebSocketMessage<T = any> {
  stream?: string;
  data: T;
  timestamp?: number;
}

// Client-to-server messages
export interface WSSubscribeMessage {
  method: 'SUBSCRIBE';
  params: string[];
  id: number;
}

export interface WSUnsubscribeMessage {
  method: 'UNSUBSCRIBE';
  params: string[];
  id: number;
}

export interface WSListSubscriptionsMessage {
  method: 'LIST_SUBSCRIPTIONS';
  id: number;
}

export type WSClientMessage = WSSubscribeMessage | WSUnsubscribeMessage | WSListSubscriptionsMessage;

// Server-to-client messages
export interface WSSubscriptionResponse {
  result: string[] | null;
  error?: WSError;
  id: number;
}

export interface WSError {
  code: number;
  message: string;
}

// Stream data types
export interface DepthStreamData {
  e: 'depthUpdate';
  E: number; // Event time
  s: string; // Symbol
  U: number; // First update ID
  u: number; // Final update ID
  b: [string, string][]; // Bids [price, quantity]
  a: [string, string][]; // Asks [price, quantity]
}

export interface TradeStreamData {
  e: 'trade';
  E: number; // Event time
  s: string; // Symbol
  t: string; // Trade ID
  p: string; // Price
  q: string; // Quantity
  b: string; // Buyer order ID
  a: string; // Seller order ID
  T: number; // Trade time
  m: boolean; // Is buyer maker
  M: boolean; // Ignore
}

export interface TickerStreamData {
  e: '24hrTicker';
  E: number; // Event time
  s: string; // Symbol
  p: string; // Price change
  P: string; // Price change percent
  w: string; // Weighted average price
  x: string; // Previous close price
  c: string; // Current close price
  Q: string; // Close quantity
  b: string; // Best bid price
  B: string; // Best bid quantity
  a: string; // Best ask price
  A: string; // Best ask quantity
  o: string; // Open price
  h: string; // High price
  l: string; // Low price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
  O: number; // Statistics open time
  C: number; // Statistics close time
  F: string; // First trade ID
  L: string; // Last trade ID
  n: number; // Total count of trades
}

export interface KlineStreamData {
  e: 'kline';
  E: number; // Event time
  s: string; // Symbol
  k: {
    t: number; // Kline start time
    T: number; // Kline close time
    s: string; // Symbol
    i: string; // Interval
    f: string; // First trade ID
    L: string; // Last trade ID
    o: string; // Open price
    c: string; // Close price
    h: string; // High price
    l: string; // Low price
    v: string; // Base asset volume
    n: number; // Number of trades
    x: boolean; // Is this kline closed?
    q: string; // Quote asset volume
    V: string; // Taker buy base asset volume
    Q: string; // Taker buy quote asset volume
    B: string; // Ignore
  };
}

// User data streams (private)
export interface ExecutionReportData {
  e: 'executionReport';
  E: number; // Event time
  s: string; // Symbol
  c: string; // Client order ID
  S: OrderSide; // Side
  o: OrderType; // Order type
  f: TimeInForce; // Time in force
  q: string; // Order quantity
  p: string; // Order price
  P: string; // Stop price
  F: string; // Iceberg quantity
  g: number; // OrderListId
  C: string; // Original client order ID
  x: 'NEW' | 'CANCELED' | 'REPLACED' | 'REJECTED' | 'TRADE' | 'EXPIRED'; // Current execution type
  X: OrderStatus; // Current order status
  r: 'NONE' | 'UNKNOWN_INSTRUMENT' | 'MARKET_CLOSED' | 'PRICE_QTY_EXCEED_HARD_LIMITS' | 'UNKNOWN_ORDER' | 'DUPLICATE_ORDER' | 'UNKNOWN_ACCOUNT' | 'INSUFFICIENT_BALANCE' | 'ACCOUNT_INACTIVE' | 'ACCOUNT_CANNOT_SETTLE'; // Order reject reason
  i: string; // Order ID
  l: string; // Last executed quantity
  z: string; // Cumulative filled quantity
  L: string; // Last executed price
  n: string; // Commission amount
  N: string; // Commission asset
  T: number; // Transaction time
  t: string; // Trade ID
  I: number; // Ignore
  w: boolean; // Is the order on the book?
  m: boolean; // Is this trade the maker side?
  M: boolean; // Ignore
  O: number; // Order creation time
  Z: string; // Cumulative quote asset transacted quantity
  Y: string; // Last quote asset transacted quantity
  Q: string; // Quote order quantity
}

export interface OutboundAccountPositionData {
  e: 'outboundAccountPosition';
  E: number; // Event time
  u: number; // Time of last account update
  B: Array<{
    a: string; // Asset
    f: string; // Free
    l: string; // Locked
  }>;
}

export interface BalanceUpdateData {
  e: 'balanceUpdate';
  E: number; // Event time
  a: string; // Asset
  d: string; // Balance delta
  T: number; // Clear time
}

// API Request/Response Types
// Standard API response wrapper
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  timestamp: number;
  requestId?: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
}

// Pagination
export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Health check
export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: number;
  uptime: number;
  version: string;
  services: {
    [serviceName: string]: 'connected' | 'disconnected' | 'error';
  };
  metrics?: {
    [metricName: string]: number;
  };
}

// Rate limiting
export interface RateLimit {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds
}

// API Key management
export interface APIKey {
  keyId: string;
  userId: string;
  name: string;
  permissions: APIPermission[];
  ipWhitelist?: string[];
  isActive: boolean;
  createdAt: number;
  lastUsedAt?: number;
  expiresAt?: number;
}

export type APIPermission = 'read' | 'trade' | 'withdraw' | 'futures' | 'margin';

// Error codes
export const API_ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  API_KEY_INVALID: 'API_KEY_INVALID',
  API_KEY_EXPIRED: 'API_KEY_EXPIRED',
  SIGNATURE_INVALID: 'SIGNATURE_INVALID',
  
  // Request validation
  BAD_REQUEST: 'BAD_REQUEST',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  REQUIRED_PARAMETER: 'REQUIRED_PARAMETER',
  PARAMETER_OUT_OF_RANGE: 'PARAMETER_OUT_OF_RANGE',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  REQUEST_WEIGHT_EXCEEDED: 'REQUEST_WEIGHT_EXCEEDED',
  
  // Business logic
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INVALID_ORDER: 'INVALID_ORDER',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  MARKET_NOT_FOUND: 'MARKET_NOT_FOUND',
  MARKET_CLOSED: 'MARKET_CLOSED',
  PRICE_FILTER: 'PRICE_FILTER',
  LOT_SIZE: 'LOT_SIZE',
  MIN_NOTIONAL: 'MIN_NOTIONAL',
  MAX_POSITION: 'MAX_POSITION',
  
  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  MAINTENANCE: 'MAINTENANCE',
} as const;

export type APIErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];

// Engine-Specific Types
// Messages from API to Engine
export interface MessageFromApi {
  type: 'CREATE_ORDER' | 'CANCEL_ORDER' | 'GET_DEPTH' | 'GET_OPEN_ORDERS' | 'ON_RAMP';
  data: any;
  clientId: string;
  requestId?: string;
  timestamp: number;
}

export interface CreateOrderMessage {
  type: 'CREATE_ORDER';
  data: {
    market: string;
    price: string;
    quantity: string;
    side: OrderSide;
    userId: string;
    orderType?: OrderType;
    timeInForce?: TimeInForce;
    clientOrderId?: string;
  };
}

export interface CancelOrderMessage {
  type: 'CANCEL_ORDER';
  data: {
    orderId: string;
    market: string;
    userId?: string;
  };
}

export interface GetDepthMessage {
  type: 'GET_DEPTH';
  data: {
    market: string;
    limit?: number;
  };
}

export interface GetOpenOrdersMessage {
  type: 'GET_OPEN_ORDERS';
  data: {
    userId: string;
    market: string;
  };
}

export interface OnRampMessage {
  type: 'ON_RAMP';
  data: {
    userId: string;
    amount: string;
    asset: string;
  };
}

// Messages from Engine to API
export interface MessageToApi {
  type: 'ORDER_PLACED' | 'ORDER_CANCELLED' | 'OPEN_ORDERS' | 'DEPTH' | 'ERROR';
  payload: any;
  requestId?: string;
  timestamp: number;
}

export interface OrderPlacedResponse {
  type: 'ORDER_PLACED';
  payload: {
    orderId: string;
    executedQty: string;
    fills: Fill[];
    status: OrderStatus;
  };
}

export interface OrderCancelledResponse {
  type: 'ORDER_CANCELLED';
  payload: {
    orderId: string;
    executedQty: string;
    remainingQty: string;
    status: OrderStatus;
  };
}

// Engine internal types
export interface UserBalance {
  [asset: string]: {
    available: string;
    locked: string;
  };
}

export interface OrderbookSnapshot {
  baseAsset: string;
  quoteAsset: string;
  bids: Order[];
  asks: Order[];
  lastTradeId: number;
  currentPrice: string;
  timestamp: number;
}

export interface EngineSnapshot {
  orderbooks: OrderbookSnapshot[];
  balances: Array<[string, UserBalance]>; // Map entries
  timestamp: number;
  version: string;
}

// Matching engine events
export interface MatchingEvent {
  type: 'ORDER_ADDED' | 'ORDER_MATCHED' | 'ORDER_CANCELLED' | 'TRADE_EXECUTED';
  data: any;
  timestamp: number;
}

export interface TradeExecutedEvent {
  type: 'TRADE_EXECUTED';
  data: {
    tradeId: string;
    buyOrderId: string;
    sellOrderId: string;
    price: string;
    quantity: string;
    buyerId: string;
    sellerId: string;
    market: string;
    timestamp: number;
  };
}

// Database Entity Types
// Database message types for async processing
export interface DbMessage {
  type: 'TRADE_ADDED' | 'ORDER_UPDATE' | 'BALANCE_UPDATE' | 'USER_CREATED' | 'MARKET_CREATED';
  data: any;
  timestamp: number;
  retryCount?: number;
}

export interface TradeAddedMessage {
  type: 'TRADE_ADDED';
  data: {
    id: string;
    market: string;
    price: string;
    quantity: string;
    quoteQuantity: string;
    buyerId: string;
    sellerId: string;
    buyerOrderId: string;
    sellerOrderId: string;
    isBuyerMaker: boolean;
    timestamp: number;
  };
}

export interface OrderUpdateMessage {
  type: 'ORDER_UPDATE';
  data: {
    orderId: string;
    status?: OrderStatus;
    filledQuantity?: string;
    averagePrice?: string;
    updatedAt: number;
  };
}

export interface BalanceUpdateMessage {
  type: 'BALANCE_UPDATE';
  data: {
    userId: string;
    asset: string;
    availableChange: string;
    lockedChange: string;
    referenceId?: string;
    referenceType: string;
  };
}

// Database entity interfaces
export interface UserEntity {
  id: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  kyc_status: KYCStatus;
  account_status: AccountStatus;
  two_factor_enabled: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
}

export interface MarketEntity {
  symbol: string;
  base_asset: string;
  quote_asset: string;
  min_quantity: string;
  max_quantity: string;
  min_price: string;
  max_price: string;
  tick_size: string;
  step_size: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OrderEntity {
  id: string;
  user_id: string;
  market: string;
  side: OrderSide;
  order_type: OrderType;
  price: string;
  quantity: string;
  filled_quantity: string;
  status: OrderStatus;
  time_in_force: TimeInForce;
  created_at: Date;
  updated_at: Date;
  filled_at?: Date;
  cancelled_at?: Date;
}

export interface TradeEntity {
  id: string;
  market: string;
  buyer_order_id: string;
  seller_order_id: string;
  buyer_id: string;
  seller_id: string;
  price: string;
  quantity: string;
  quote_quantity: string;
  is_buyer_maker: boolean;
  trade_fee_buyer: string;
  trade_fee_seller: string;
  executed_at: Date;
  sequence_number: number;
}

export interface BalanceEntity {
  user_id: string;
  asset: string;
  available_balance: string;
  locked_balance: string;
  last_updated: Date;
}

export interface OHLCVEntity {
  market: string;
  open_time: Date;
  close_time: Date;
  open_price: string;
  high_price: string;
  low_price: string;
  close_price: string;
  volume: string;
  quote_volume: string;
  trade_count: number;
  taker_buy_volume: string;
  taker_buy_quote_volume: string;
}

// Type Guards
// Order type guards
export function isLimitOrder(order: Order): order is LimitOrder {
  return order.type === 'limit';
}

export function isMarketOrder(order: Order): order is MarketOrder {
  return order.type === 'market';
}

export function isStopOrder(order: Order): order is StopOrder {
  return order.type === 'stop';
}

export function isStopLimitOrder(order: Order): order is StopLimitOrder {
  return order.type === 'stop_limit';
}

// WebSocket message type guards
export function isDepthStreamData(data: any): data is DepthStreamData {
  return data.e === 'depthUpdate';
}

export function isTradeStreamData(data: any): data is TradeStreamData {
  return data.e === 'trade';
}

export function isTickerStreamData(data: any): data is TickerStreamData {
  return data.e === '24hrTicker';
}

export function isKlineStreamData(data: any): data is KlineStreamData {
  return data.e === 'kline';
}

// API message type guards
export function isCreateOrderMessage(msg: MessageFromApi): boolean {
  return msg.type === 'CREATE_ORDER';
}

export function isCancelOrderMessage(msg: MessageFromApi): boolean {
  return msg.type === 'CANCEL_ORDER';
}

export function isGetDepthMessage(msg: MessageFromApi): boolean {
  return msg.type === 'GET_DEPTH';
}

// Error type guards
export function isAPIError(error: any): error is APIError {
  return error && typeof error.code === 'string' && typeof error.message === 'string';
}

// Validation helpers
export function isValidOrderSide(side: string): side is OrderSide {
  return side === 'buy' || side === 'sell';
}

export function isValidOrderType(type: string): type is OrderType {
  return ['limit', 'market', 'stop', 'stop_limit'].includes(type);
}

export function isValidOrderStatus(status: string): status is OrderStatus {
  return ['open', 'filled', 'cancelled', 'rejected', 'partially_filled'].includes(status);
}

export function isValidTimeInForce(tif: string): tif is TimeInForce {
  return ['GTC', 'IOC', 'FOK', 'GTT'].includes(tif);
}

export function isValidKlineInterval(interval: string): interval is KlineInterval {
  return ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'].includes(interval);
}

// Constants
// Market constants
export const MAX_PRICE_PRECISION = 8;
export const MAX_QUANTITY_PRECISION = 8;
export const MIN_ORDER_VALUE = '10'; // Minimum order value in quote asset
export const MAX_ORDER_VALUE = '1000000'; // Maximum order value in quote asset

// Time constants
export const KLINE_INTERVALS = {
  '1m': 60 * 1000,
  '3m': 3 * 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '2h': 2 * 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '8h': 8 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '3d': 3 * 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
} as const;

// Trading constants
export const DEFAULT_MAKER_FEE = '0.001'; // 0.1%
export const DEFAULT_TAKER_FEE = '0.001'; // 0.1%
export const MAX_OPEN_ORDERS_PER_USER = 200;
export const MAX_ORDERS_PER_SECOND = 10;

// WebSocket constants
export const WS_HEARTBEAT_INTERVAL = 30000; // 30 seconds
export const WS_RECONNECT_DELAY = 5000; // 5 seconds
export const WS_MAX_SUBSCRIPTIONS = 50;

// Database constants
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 1000;
export const ORDER_HISTORY_RETENTION_DAYS = 90;
export const TRADE_HISTORY_RETENTION_YEARS = 7;

// Asset constants
export const SUPPORTED_ASSETS = [
  'BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'ADA', 'DOT', 'LINK', 'SOL', 'MATIC',
  'TATA', 'RELIANCE', 'HDFC', 'INR'
] as const;

export type SupportedAsset = typeof SUPPORTED_ASSETS[number];

// Network constants
export const BLOCKCHAIN_NETWORKS = {
  BTC: ['bitcoin'],
  ETH: ['ethereum', 'bsc', 'polygon'],
  USDT: ['ethereum', 'tron', 'bsc', 'polygon'],
  USDC: ['ethereum', 'bsc', 'polygon'],
} as const;