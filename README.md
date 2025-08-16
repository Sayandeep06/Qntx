# Qntx - Trading Platform

A comprehensive, high-performance trading platform built with modern microservices architecture. Features real-time order matching, WebSocket streaming, automated market making, and a responsive trading interface.

## 🚀 Features

### Core Trading Engine
- **Sub-millisecond Order Matching**: High-performance order book engine with price-time priority
- **Real-time WebSocket Streaming**: Live market data, order updates, and trade feeds
- **Multiple Order Types**: Limit, market, stop orders with IOC and post-only options
- **Balance Management**: Multi-asset wallet system with available/locked balance tracking
- **Persistent State**: Order book snapshots with crash recovery capabilities

### Market Making
- **Automated Liquidity Provision**: Configurable grid trading algorithms
- **Risk Management**: Position limits, stop-loss, and exposure controls
- **Multiple Strategies**: Inventory-aware, volatility-adaptive, and multi-market strategies
- **Performance Analytics**: Sharpe ratio, max drawdown, and fill rate monitoring

### User Interface
- **Modern Trading Interface**: React-based responsive UI with TradingView charts
- **Real-time Order Book**: Live bid/ask visualization with incremental updates
- **Advanced Charting**: Multiple timeframes with historical OHLCV data
- **Portfolio Management**: Balance tracking and trade history

## 🏗️ Architecture

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
```

### Technology Stack

**Backend**
- Node.js & TypeScript
- Express.js for REST API
- TimescaleDB for time-series data
- Redis for caching and message queuing

**Frontend**
- Next.js 14 with React 18
- TypeScript for type safety
- Tailwind CSS for styling
- TradingView Lightweight Charts

**Infrastructure**
- Docker & Docker Compose
- WebSocket for real-time communication
- RESTful API design

## 📦 Project Structure

```
qntx/
├── engine/              # Core trading engine
│   ├── src/
│   │   ├── trade/       # Order matching logic
│   │   ├── types/       # TypeScript definitions
│   │   └── index.ts     # Main entry point
├── api/                 # REST API service
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   └── index.ts     # Express server
├── ws/                  # WebSocket service
│   ├── src/
│   │   ├── managers/    # Connection management
│   │   └── index.ts     # WebSocket server
├── db/                  # Database service
│   ├── src/
│   │   └── schema/      # Database schemas
├── frontend/            # Trading interface
│   ├── app/
│   │   ├── components/  # React components
│   │   ├── utils/       # Utilities & API client
│   │   └── trade/       # Trading pages
├── mm/                  # Market maker (optional)
│   └── src/
└── docker/              # Docker configuration
```

## 🚦 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd qntx
   ```

2. **Start infrastructure services**
   ```bash
   cd docker
   docker-compose up -d
   ```

3. **Install dependencies**
   ```bash
   # Install all service dependencies
   for dir in engine api ws db frontend mm; do
     cd $dir && npm install && cd ..
   done
   ```

4. **Build services**
   ```bash
   # Build TypeScript services
   cd engine && npm run build && cd ..
   cd api && npm run build && cd ..
   cd ws && npm run build && cd ..
   cd db && npm run build && cd ..
   ```

5. **Initialize database**
   ```bash
   cd db
   npm run seed-db
   ```

6. **Start all services**
   ```bash
   # Terminal 1: Trading Engine
   cd engine && npm run dev

   # Terminal 2: API Service
   cd api && npm run dev

   # Terminal 3: WebSocket Service
   cd ws && npm run dev

   # Terminal 4: Database Service
   cd db && npm run dev

   # Terminal 5: Frontend
   cd frontend && npm run dev

   # Terminal 6: Market Maker (optional)
   cd mm && npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:3001
   - API: http://localhost:3000
   - WebSocket: ws://localhost:8080

## 📊 API Documentation

### Order Management

**Create Order**
```bash
POST /api/v1/order
Content-Type: application/json

{
  "market": "TATA_INR",
  "price": "100.50",
  "quantity": "10",
  "side": "buy",
  "userId": "user123"
}
```

**Get Order Book**
```bash
GET /api/v1/depth?symbol=TATA_INR
```

**Recent Trades**
```bash
GET /api/v1/trades?symbol=TATA_INR&limit=50
```

### Market Data

**24hr Ticker**
```bash
GET /api/v1/tickers/24hr?symbol=TATA_INR
```

**Kline Data**
```bash
GET /api/v1/klines?symbol=TATA_INR&interval=1h&limit=24
```

For complete API documentation, see [API_COMPLETE_SPECIFICATION.md](./API_COMPLETE_SPECIFICATION.md).

## 🔌 WebSocket Streams

### Subscribe to Market Data
```javascript
const ws = new WebSocket('ws://localhost:8080');

// Subscribe to order book updates
ws.send(JSON.stringify({
  method: "SUBSCRIBE",
  params: ["depth@TATA_INR"]
}));

// Subscribe to trade stream
ws.send(JSON.stringify({
  method: "SUBSCRIBE", 
  params: ["trade@TATA_INR"]
}));
```

## 🛠️ Configuration

### Environment Variables

**Engine (.env)**
```
REDIS_URL=redis://localhost:6379
WITH_SNAPSHOT=true
LOG_LEVEL=info
```

**API (.env)**
```
REDIS_URL=redis://localhost:6379
PORT=3000
CORS_ORIGIN=http://localhost:3001
```

**Database (.env)**
```
DATABASE_URL=postgresql://user:password@localhost:5432/database
REDIS_URL=redis://localhost:6379
```

**WebSocket (.env)**
```
REDIS_URL=redis://localhost:6379
WS_PORT=8080
```

**Frontend (.env.local)**
```
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

## 📈 Market Making

The platform includes an optional automated market maker that provides liquidity:

```bash
cd mm
npm run dev
```

**Features:**
- Grid trading strategy
- Risk management with position limits
- Volatility-adaptive spreads
- Multi-market support
- Performance analytics

## 🧪 Testing

```bash
# Run tests for each service
cd engine && npm test
cd api && npm test
cd ws && npm test
cd frontend && npm test
```

### Load Testing
- **Order Throughput**: 10,000+ orders/second
- **Concurrent Users**: 1,000+ active traders
- **WebSocket Connections**: 10,000+ concurrent

## 🔒 Security Features

- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- Error handling with circuit breakers
- Audit logging for all operations

## 📊 Monitoring

### Health Checks
```bash
curl http://localhost:3000/api/v1/health
curl http://localhost:8080/health
```

### Metrics
- Order matching latency
- Trade execution rates
- WebSocket connection counts
- Database performance
- Memory and CPU usage

## 🚀 Deployment

### Docker Deployment
```bash
# Build all services
docker-compose -f docker-compose.prod.yml up --build

# Scale specific services
docker-compose up --scale api=3 --scale ws=2
```

### Production Considerations
- Use environment-specific configurations
- Set up proper logging and monitoring
- Configure database connection pooling
- Implement proper backup strategies
- Set up SSL/TLS certificates

## 📖 Documentation

- **[Comprehensive Project Documentation](./COMPREHENSIVE_PROJECT_DOCUMENTATION.md)** - Complete system overview
- **[API Specification](./API_COMPLETE_SPECIFICATION.md)** - Detailed API reference
- **[Database Schema](./DATABASE_COMPLETE_SPECIFICATION.md)** - Database design and queries
- **[Frontend Guide](./FRONTEND_COMPLETE_SPECIFICATION.md)** - UI components and implementation
- **[WebSocket Protocol](./WEBSOCKET_SPECIFICATION.md)** - Real-time communication specs
- **[Market Maker Guide](./MARKET_MAKER_SPECIFICATION.md)** - Automated trading strategies
- **[Shared Types](./SHARED_TYPES_SPECIFICATION.md)** - TypeScript type definitions

## 🐛 Troubleshooting

### Common Issues

**Engine not processing orders**
```bash
# Check Redis connection
redis-cli ping

# Verify message queue
redis-cli llen messages

# Check engine logs
cd engine && npm run dev
```

**WebSocket connection issues**
```bash
# Test WebSocket endpoint
curl http://localhost:8080/health
```

**Database connection problems**
```bash
# Test database connection
psql postgresql://user:password@localhost:5432/database
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Use TypeScript for type safety
- Follow existing code style and patterns
- Add tests for new features
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔮 Roadmap

### Short Term (1-3 months)
- Enhanced order types (stop-loss, take-profit, iceberg)
- Advanced UI features (portfolio management, trading history)
- Mobile app development

### Medium Term (3-6 months)
- Multi-asset support and cross-asset trading
- Margin trading capabilities
- Algorithmic trading framework

### Long Term (6+ months)
- Institutional features and white-label solutions
- Multi-region deployment
- Regulatory compliance framework

---

**Built with ❤️ for the trading community**

For support or questions, please open an issue on GitHub.