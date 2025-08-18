# Complete Database Service Specification

## Overview

The database service manages all persistent data for the cryptocurrency trading platform using TimescaleDB (PostgreSQL with time-series extensions) for optimal performance with time-series data like trades and price history.

**Technology Stack**:
- **Database**: TimescaleDB (PostgreSQL 12+ with TimescaleDB extension)
- **Connection**: Node.js with `pg` (node-postgres)
- **Message Queue**: Redis for async processing
- **Language**: TypeScript

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Engine      │───►│     Redis       │───►│   DB Service    │
│   (Trading)     │    │   (Message      │    │  (Persistence)  │
└─────────────────┘    │    Queue)       │    └─────────────────┘
                       └─────────────────┘             │
                                                       ▼
                                            ┌─────────────────┐
                                            │   TimescaleDB   │
                                            │  (PostgreSQL)   │
                                            └─────────────────┘
```

## Database Schema

### 1. Users Table

```sql
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
    two_factor_enabled BOOLEAN DEFAULT false
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);
```

### 2. Markets Table

```sql
CREATE TABLE markets (
    symbol VARCHAR(20) PRIMARY KEY,
    base_asset VARCHAR(10) NOT NULL,
    quote_asset VARCHAR(10) NOT NULL,
    min_quantity DECIMAL(20,8) DEFAULT 0.00000001,
    max_quantity DECIMAL(20,8) DEFAULT 1000000,
    min_price DECIMAL(20,8) DEFAULT 0.00000001,
    max_price DECIMAL(20,8) DEFAULT 1000000,
    tick_size DECIMAL(20,8) DEFAULT 0.00000001,
    step_size DECIMAL(20,8) DEFAULT 0.00000001,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sample data
INSERT INTO markets (symbol, base_asset, quote_asset, tick_size, step_size) VALUES
('TATA_INR', 'TATA', 'INR', 0.01, 0.001),
('RELIANCE_INR', 'RELIANCE', 'INR', 0.01, 0.001),
('HDFC_INR', 'HDFC', 'INR', 0.01, 0.001);
```

### 3. Orders Table

```sql
CREATE TABLE orders (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    market VARCHAR(20) NOT NULL REFERENCES markets(symbol),
    side VARCHAR(4) NOT NULL CHECK (side IN ('buy', 'sell')),
    order_type VARCHAR(10) DEFAULT 'limit' CHECK (order_type IN ('limit', 'market', 'stop')),
    price DECIMAL(20,8) NOT NULL,
    quantity DECIMAL(20,8) NOT NULL,
    filled_quantity DECIMAL(20,8) DEFAULT 0,
    remaining_quantity DECIMAL(20,8) GENERATED ALWAYS AS (quantity - filled_quantity) STORED,
    status VARCHAR(10) DEFAULT 'open' CHECK (status IN ('open', 'filled', 'cancelled', 'rejected')),
    time_in_force VARCHAR(3) DEFAULT 'GTC' CHECK (time_in_force IN ('GTC', 'IOC', 'FOK')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    filled_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_market ON orders(market);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_user_market_status ON orders(user_id, market, status);
CREATE INDEX idx_orders_market_side_price ON orders(market, side, price) WHERE status = 'open';
```

### 4. Trades Table (Hypertable)

```sql
-- Main trades table
CREATE TABLE trades (
    id VARCHAR(255) PRIMARY KEY,
    market VARCHAR(20) NOT NULL,
    buyer_order_id VARCHAR(255) NOT NULL,
    seller_order_id VARCHAR(255) NOT NULL,
    buyer_id VARCHAR(255) NOT NULL,
    seller_id VARCHAR(255) NOT NULL,
    price DECIMAL(20,8) NOT NULL,
    quantity DECIMAL(20,8) NOT NULL,
    quote_quantity DECIMAL(20,8) GENERATED ALWAYS AS (price * quantity) STORED,
    is_buyer_maker BOOLEAN NOT NULL,
    trade_fee_buyer DECIMAL(20,8) DEFAULT 0,
    trade_fee_seller DECIMAL(20,8) DEFAULT 0,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sequence_number BIGSERIAL
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('trades', 'executed_at', chunk_time_interval => INTERVAL '1 day');

-- Indexes
CREATE INDEX idx_trades_market ON trades(market, executed_at DESC);
CREATE INDEX idx_trades_buyer_id ON trades(buyer_id, executed_at DESC);
CREATE INDEX idx_trades_seller_id ON trades(seller_id, executed_at DESC);
CREATE INDEX idx_trades_sequence ON trades(sequence_number DESC);

-- Add foreign key constraints
ALTER TABLE trades ADD CONSTRAINT fk_trades_buyer_order FOREIGN KEY (buyer_order_id) REFERENCES orders(id);
ALTER TABLE trades ADD CONSTRAINT fk_trades_seller_order FOREIGN KEY (seller_order_id) REFERENCES orders(id);
ALTER TABLE trades ADD CONSTRAINT fk_trades_buyer FOREIGN KEY (buyer_id) REFERENCES users(id);
ALTER TABLE trades ADD CONSTRAINT fk_trades_seller FOREIGN KEY (seller_id) REFERENCES users(id);
```

### 5. Balances Table

```sql
CREATE TABLE balances (
    user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    asset VARCHAR(10) NOT NULL,
    available_balance DECIMAL(20,8) DEFAULT 0 CHECK (available_balance >= 0),
    locked_balance DECIMAL(20,8) DEFAULT 0 CHECK (locked_balance >= 0),
    total_balance DECIMAL(20,8) GENERATED ALWAYS AS (available_balance + locked_balance) STORED,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, asset)
);

-- Indexes
CREATE INDEX idx_balances_user_id ON balances(user_id);
CREATE INDEX idx_balances_asset ON balances(asset);
```

### 6. Balance History Table (Hypertable)

```sql
CREATE TABLE balance_history (
    id BIGSERIAL,
    user_id VARCHAR(255) NOT NULL,
    asset VARCHAR(10) NOT NULL,
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('deposit', 'withdrawal', 'trade', 'fee', 'adjustment')),
    amount DECIMAL(20,8) NOT NULL,
    balance_before DECIMAL(20,8) NOT NULL,
    balance_after DECIMAL(20,8) NOT NULL,
    reference_id VARCHAR(255), -- Order ID, trade ID, etc.
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
);

-- Convert to hypertable
SELECT create_hypertable('balance_history', 'created_at', chunk_time_interval => INTERVAL '1 week');

-- Indexes
CREATE INDEX idx_balance_history_user_asset ON balance_history(user_id, asset, created_at DESC);
CREATE INDEX idx_balance_history_reference ON balance_history(reference_id);
```

### 7. OHLCV Data Tables (Hypertables)

```sql
-- 1-minute OHLCV data
CREATE TABLE ohlcv_1m (
    market VARCHAR(20) NOT NULL,
    open_time TIMESTAMP WITH TIME ZONE NOT NULL,
    close_time TIMESTAMP WITH TIME ZONE NOT NULL,
    open_price DECIMAL(20,8) NOT NULL,
    high_price DECIMAL(20,8) NOT NULL,
    low_price DECIMAL(20,8) NOT NULL,
    close_price DECIMAL(20,8) NOT NULL,
    volume DECIMAL(20,8) NOT NULL,
    quote_volume DECIMAL(20,8) NOT NULL,
    trade_count INTEGER NOT NULL,
    taker_buy_volume DECIMAL(20,8) DEFAULT 0,
    taker_buy_quote_volume DECIMAL(20,8) DEFAULT 0,
    PRIMARY KEY (market, open_time)
);

SELECT create_hypertable('ohlcv_1m', 'open_time', chunk_time_interval => INTERVAL '1 day');

-- Create similar tables for other intervals
CREATE TABLE ohlcv_5m (LIKE ohlcv_1m INCLUDING ALL);
CREATE TABLE ohlcv_15m (LIKE ohlcv_1m INCLUDING ALL);
CREATE TABLE ohlcv_1h (LIKE ohlcv_1m INCLUDING ALL);
CREATE TABLE ohlcv_4h (LIKE ohlcv_1m INCLUDING ALL);
CREATE TABLE ohlcv_1d (LIKE ohlcv_1m INCLUDING ALL);

SELECT create_hypertable('ohlcv_5m', 'open_time', chunk_time_interval => INTERVAL '1 week');
SELECT create_hypertable('ohlcv_15m', 'open_time', chunk_time_interval => INTERVAL '1 week');
SELECT create_hypertable('ohlcv_1h', 'open_time', chunk_time_interval => INTERVAL '1 month');
SELECT create_hypertable('ohlcv_4h', 'open_time', chunk_time_interval => INTERVAL '1 month');
SELECT create_hypertable('ohlcv_1d', 'open_time', chunk_time_interval => INTERVAL '1 year');
```

### 8. System Tables

```sql
-- System configuration
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trading fees configuration
CREATE TABLE trading_fees (
    market VARCHAR(20) REFERENCES markets(symbol),
    user_tier VARCHAR(20) DEFAULT 'basic',
    maker_fee DECIMAL(6,6) DEFAULT 0.001,
    taker_fee DECIMAL(6,6) DEFAULT 0.001,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (market, user_tier)
);

-- Audit log
CREATE TABLE audit_log (
    id BIGSERIAL,
    user_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
);

SELECT create_hypertable('audit_log', 'created_at', chunk_time_interval => INTERVAL '1 month');
```

## Database Service Implementation

### Core Service Structure

```typescript
// src/index.ts
import { Client } from 'pg';
import { createClient } from 'redis';
import { DbMessage } from './types';

class DatabaseService {
    private pgClient: Client;
    private redisClient: any;

    constructor() {
        this.pgClient = new Client({
            user: process.env.DB_USER || 'your_user',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'my_database',
            password: process.env.DB_PASSWORD || 'your_password',
            port: parseInt(process.env.DB_PORT || '5432'),
        });
    }

    async connect() {
        await this.pgClient.connect();
        this.redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        await this.redisClient.connect();
        console.log('Connected to PostgreSQL and Redis');
    }

    async processMessages() {
        while (true) {
            try {
                const response = await this.redisClient.rPop('db_processor');
                if (response) {
                    const data: DbMessage = JSON.parse(response);
                    await this.handleMessage(data);
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        }
    }

    async handleMessage(message: DbMessage) {
        switch (message.type) {
            case 'TRADE_ADDED':
                await this.insertTrade(message.data);
                break;
            case 'ORDER_UPDATE':
                await this.updateOrder(message.data);
                break;
            case 'BALANCE_UPDATE':
                await this.updateBalance(message.data);
                break;
            default:
                console.warn('Unknown message type:', message.type);
        }
    }
}
```

### Trade Data Management

```typescript
class TradeManager {
    constructor(private pgClient: Client) {}

    async insertTrade(tradeData: any) {
        const query = `
            INSERT INTO trades (
                id, market, buyer_order_id, seller_order_id,
                buyer_id, seller_id, price, quantity,
                is_buyer_maker, executed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        
        const values = [
            tradeData.id,
            tradeData.market,
            tradeData.buyerOrderId,
            tradeData.sellerOrderId,
            tradeData.buyerId,
            tradeData.sellerId,
            tradeData.price,
            tradeData.quantity,
            tradeData.isBuyerMaker,
            new Date(tradeData.timestamp)
        ];

        await this.pgClient.query(query, values);
        
        // Update OHLCV data
        await this.updateOHLCV(tradeData);
    }

    async updateOHLCV(tradeData: any) {
        const intervals = ['1m', '5m', '15m', '1h', '4h', '1d'];
        
        for (const interval of intervals) {
            await this.updateOHLCVForInterval(tradeData, interval);
        }
    }

    async updateOHLCVForInterval(tradeData: any, interval: string) {
        const tableName = `ohlcv_${interval}`;
        const bucketStart = this.getBucketStart(new Date(tradeData.timestamp), interval);
        
        const query = `
            INSERT INTO ${tableName} (
                market, open_time, close_time, open_price, high_price,
                low_price, close_price, volume, quote_volume, trade_count
            ) VALUES ($1, $2, $3, $4, $4, $4, $4, $5, $6, 1)
            ON CONFLICT (market, open_time) DO UPDATE SET
                high_price = GREATEST(${tableName}.high_price, $4),
                low_price = LEAST(${tableName}.low_price, $4),
                close_price = $4,
                volume = ${tableName}.volume + $5,
                quote_volume = ${tableName}.quote_volume + $6,
                trade_count = ${tableName}.trade_count + 1,
                close_time = $7
        `;

        const closeTime = new Date(bucketStart.getTime() + this.getIntervalMs(interval) - 1);
        
        await this.pgClient.query(query, [
            tradeData.market,
            bucketStart,
            closeTime,
            tradeData.price,
            tradeData.quantity,
            tradeData.price * tradeData.quantity,
            new Date(tradeData.timestamp)
        ]);
    }

    private getBucketStart(timestamp: Date, interval: string): Date {
        const bucketStart = new Date(timestamp);
        
        switch (interval) {
            case '1m':
                bucketStart.setSeconds(0, 0);
                break;
            case '5m':
                bucketStart.setMinutes(Math.floor(bucketStart.getMinutes() / 5) * 5, 0, 0);
                break;
            case '15m':
                bucketStart.setMinutes(Math.floor(bucketStart.getMinutes() / 15) * 15, 0, 0);
                break;
            case '1h':
                bucketStart.setMinutes(0, 0, 0);
                break;
            case '4h':
                bucketStart.setHours(Math.floor(bucketStart.getHours() / 4) * 4, 0, 0, 0);
                break;
            case '1d':
                bucketStart.setHours(0, 0, 0, 0);
                break;
        }
        
        return bucketStart;
    }

    private getIntervalMs(interval: string): number {
        const intervals = {
            '1m': 60 * 1000,
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '4h': 4 * 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000
        };
        return intervals[interval] || 60 * 1000;
    }
}
```

### Order Management

```typescript
class OrderManager {
    constructor(private pgClient: Client) {}

    async insertOrder(orderData: any) {
        const query = `
            INSERT INTO orders (
                id, user_id, market, side, order_type,
                price, quantity, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
        
        const values = [
            orderData.orderId,
            orderData.userId,
            orderData.market,
            orderData.side,
            orderData.orderType || 'limit',
            orderData.price,
            orderData.quantity,
            'open',
            new Date()
        ];

        await this.pgClient.query(query, values);
    }

    async updateOrder(orderData: any) {
        let query: string;
        let values: any[];

        if (orderData.executedQty) {
            // Order fill update
            query = `
                UPDATE orders SET
                    filled_quantity = filled_quantity + $1,
                    status = CASE 
                        WHEN filled_quantity + $1 >= quantity THEN 'filled'
                        ELSE status
                    END,
                    updated_at = NOW(),
                    filled_at = CASE
                        WHEN filled_quantity + $1 >= quantity THEN NOW()
                        ELSE filled_at
                    END
                WHERE id = $2
            `;
            values = [orderData.executedQty, orderData.orderId];
        } else if (orderData.status === 'cancelled') {
            // Order cancellation
            query = `
                UPDATE orders SET
                    status = 'cancelled',
                    cancelled_at = NOW(),
                    updated_at = NOW()
                WHERE id = $1
            `;
            values = [orderData.orderId];
        }

        if (query) {
            await this.pgClient.query(query, values);
        }
    }

    async getOpenOrders(userId: string, market?: string) {
        let query = `
            SELECT * FROM orders 
            WHERE user_id = $1 AND status = 'open'
        `;
        let values = [userId];

        if (market) {
            query += ' AND market = $2';
            values.push(market);
        }

        query += ' ORDER BY created_at DESC';

        const result = await this.pgClient.query(query, values);
        return result.rows;
    }
}
```

### Balance Management

```typescript
class BalanceManager {
    constructor(private pgClient: Client) {}

    async updateBalance(userId: string, asset: string, availableChange: number, lockedChange: number, referenceId?: string) {
        const client = await this.pgClient.connect();
        
        try {
            await client.query('BEGIN');

            // Get current balance
            const balanceQuery = `
                SELECT available_balance, locked_balance 
                FROM balances 
                WHERE user_id = $1 AND asset = $2
            `;
            const balanceResult = await client.query(balanceQuery, [userId, asset]);
            
            let currentAvailable = 0;
            let currentLocked = 0;
            
            if (balanceResult.rows.length > 0) {
                currentAvailable = parseFloat(balanceResult.rows[0].available_balance);
                currentLocked = parseFloat(balanceResult.rows[0].locked_balance);
            }

            const newAvailable = currentAvailable + availableChange;
            const newLocked = currentLocked + lockedChange;

            // Validate non-negative balances
            if (newAvailable < 0 || newLocked < 0) {
                throw new Error('Insufficient balance');
            }

            // Update balance
            const updateQuery = `
                INSERT INTO balances (user_id, asset, available_balance, locked_balance)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id, asset) DO UPDATE SET
                    available_balance = $3,
                    locked_balance = $4,
                    last_updated = NOW()
            `;
            await client.query(updateQuery, [userId, asset, newAvailable, newLocked]);

            // Record balance history
            if (availableChange !== 0) {
                await this.recordBalanceHistory(
                    client, userId, asset, 'trade', availableChange,
                    currentAvailable, newAvailable, referenceId
                );
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async recordBalanceHistory(client: any, userId: string, asset: string, changeType: string, amount: number, balanceBefore: number, balanceAfter: number, referenceId?: string) {
        const query = `
            INSERT INTO balance_history (
                user_id, asset, change_type, amount,
                balance_before, balance_after, reference_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        
        await client.query(query, [
            userId, asset, changeType, amount,
            balanceBefore, balanceAfter, referenceId
        ]);
    }

    async getUserBalance(userId: string) {
        const query = `
            SELECT asset, available_balance, locked_balance, total_balance
            FROM balances 
            WHERE user_id = $1
        `;
        
        const result = await this.pgClient.query(query, [userId]);
        
        const balances: any = {};
        result.rows.forEach(row => {
            balances[row.asset] = {
                available: parseFloat(row.available_balance),
                locked: parseFloat(row.locked_balance),
                total: parseFloat(row.total_balance)
            };
        });
        
        return balances;
    }
}
```

## API Queries

### Market Data Queries

```typescript
class MarketDataQueries {
    constructor(private pgClient: Client) {}

    async getKlineData(market: string, interval: string, startTime?: Date, endTime?: Date, limit: number = 500) {
        const tableName = `ohlcv_${interval}`;
        
        let query = `
            SELECT open_time, close_time, open_price, high_price, low_price,
                   close_price, volume, quote_volume, trade_count
            FROM ${tableName}
            WHERE market = $1
        `;
        
        const values = [market];
        let paramCount = 1;
        
        if (startTime) {
            paramCount++;
            query += ` AND open_time >= $${paramCount}`;
            values.push(startTime);
        }
        
        if (endTime) {
            paramCount++;
            query += ` AND open_time <= $${paramCount}`;
            values.push(endTime);
        }
        
        query += ` ORDER BY open_time DESC LIMIT $${paramCount + 1}`;
        values.push(limit);
        
        const result = await this.pgClient.query(query, values);
        return result.rows;
    }

    async getRecentTrades(market: string, limit: number = 100) {
        const query = `
            SELECT id, price, quantity, is_buyer_maker, executed_at
            FROM trades
            WHERE market = $1
            ORDER BY executed_at DESC
            LIMIT $2
        `;
        
        const result = await this.pgClient.query(query, [market, limit]);
        return result.rows;
    }

    async get24hrTicker(market: string) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const query = `
            SELECT 
                COUNT(*) as trade_count,
                SUM(quantity) as volume,
                SUM(quote_quantity) as quote_volume,
                MIN(price) as low_price,
                MAX(price) as high_price,
                (SELECT price FROM trades WHERE market = $1 AND executed_at >= $2 ORDER BY executed_at ASC LIMIT 1) as open_price,
                (SELECT price FROM trades WHERE market = $1 ORDER BY executed_at DESC LIMIT 1) as close_price
            FROM trades
            WHERE market = $1 AND executed_at >= $2
        `;
        
        const result = await this.pgClient.query(query, [market, oneDayAgo]);
        return result.rows[0];
    }
}
```

## Performance Optimization

### Indexing Strategy

```sql
-- Time-series indexes with BTREe
CREATE INDEX CONCURRENTLY idx_trades_market_time_brin 
ON trades USING BRIN (market, executed_at);

-- Partial indexes for active orders
CREATE INDEX CONCURRENTLY idx_orders_active 
ON orders (market, side, price) 
WHERE status = 'open';

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_balance_history_user_time 
ON balance_history (user_id, created_at DESC, asset);
```

### Data Retention Policies

```sql
-- Set up data retention for old data
SELECT add_retention_policy('trades', INTERVAL '2 years');
SELECT add_retention_policy('balance_history', INTERVAL '7 years');
SELECT add_retention_policy('audit_log', INTERVAL '1 year');

-- Compression for older data
SELECT add_compression_policy('trades', INTERVAL '30 days');
SELECT add_compression_policy('ohlcv_1m', INTERVAL '7 days');
```

### Continuous Aggregates

```sql
-- Create continuous aggregates for real-time analytics
CREATE MATERIALIZED VIEW trades_hourly_summary
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', executed_at) AS hour,
    market,
    COUNT(*) as trade_count,
    SUM(quantity) as volume,
    SUM(quote_quantity) as quote_volume,
    AVG(price) as avg_price,
    MIN(price) as min_price,
    MAX(price) as max_price
FROM trades
GROUP BY hour, market;

-- Add refresh policy
SELECT add_continuous_aggregate_policy('trades_hourly_summary',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');
```

## Monitoring and Maintenance

### Health Checks

```typescript
class DatabaseHealth {
    constructor(private pgClient: Client) {}

    async checkHealth() {
        try {
            // Check database connection
            await this.pgClient.query('SELECT 1');
            
            // Check table sizes
            const tableSizes = await this.getTableSizes();
            
            // Check active connections
            const connections = await this.getActiveConnections();
            
            // Check for long-running queries
            const longQueries = await this.getLongRunningQueries();
            
            return {
                status: 'healthy',
                tableSizes,
                connections,
                longQueries
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }

    async getTableSizes() {
        const query = `
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
        `;
        
        const result = await this.pgClient.query(query);
        return result.rows;
    }

    async getActiveConnections() {
        const query = `
            SELECT 
                count(*) as total_connections,
                count(*) FILTER (WHERE state = 'active') as active_connections,
                count(*) FILTER (WHERE state = 'idle') as idle_connections
            FROM pg_stat_activity;
        `;
        
        const result = await this.pgClient.query(query);
        return result.rows[0];
    }
}
```

### Backup Strategy

```bash
#!/bin/bash
# Database backup script

# Full database backup
pg_dump -h localhost -U your_user -d my_database -F c -f "backup_$(date +%Y%m%d_%H%M%S).dump"

# Compress recent trades data
psql -h localhost -U your_user -d my_database -c "
    SELECT compress_chunk(show_chunks('trades')) 
    WHERE chunk_name IN (
        SELECT show_chunks('trades') 
        WHERE range_start < NOW() - INTERVAL '30 days'
    );
"

# Export OHLCV data for external systems
psql -h localhost -U your_user -d my_database -c "
    COPY (
        SELECT * FROM ohlcv_1d 
        WHERE open_time >= NOW() - INTERVAL '1 year'
    ) TO '/backups/ohlcv_daily.csv' WITH CSV HEADER;
"
```

## Error Handling and Recovery

### Transaction Management

```typescript
class TransactionManager {
    async executeInTransaction<T>(client: any, operation: () => Promise<T>): Promise<T> {
        try {
            await client.query('BEGIN');
            const result = await operation();
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }

    async retryOperation<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
        let lastError: Error;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Exponential backoff
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError!;
    }
}
```

This comprehensive database specification provides a complete foundation for the trading platform's data persistence layer with proper optimization, monitoring, and maintenance procedures.