# Marketing Automation Engine - Backend

Node.js Express backend for the Marketing Automation Engine (CRM).

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MySQL 8.0+ (running on host or external server)
- Docker & Docker Compose

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Test connections:**
   ```bash
   # Test MySQL connection
   npm run test:mysql

   # Test Redis connection (requires Redis to be running)
   npm run test:redis
   ```

### Development

**Option 1: Run with Docker Compose (Recommended)**
```bash
# From project root
docker-compose up
```

**Option 2: Run locally**
```bash
# Make sure Redis is running
docker-compose up redis

# Start development server
npm run dev
```

The server will start on `http://localhost:3000`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.js  # MySQL connection pool
│   │   └── redis.js     # Redis client
│   ├── models/          # Sequelize models (to be added)
│   ├── routes/          # Express routes (to be added)
│   ├── services/        # Business logic (to be added)
│   ├── middlewares/     # Custom middleware (to be added)
│   ├── utils/           # Utility functions (to be added)
│   ├── app.js           # Express app configuration
│   └── server.js        # Server entry point
├── test-mysql.js        # MySQL connection test
├── test-redis.js        # Redis connection test
├── .env.example         # Environment variables template
├── Dockerfile           # Docker configuration
└── package.json         # Dependencies and scripts
```

## 🔧 Environment Variables

See `.env.example` for all available configuration options.

### Key Variables:
- `DB_HOST`: MySQL host (use `host.docker.internal` for Docker)
- `DB_NAME`: Database name
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password
- `REDIS_HOST`: Redis host (use `redis` for Docker)
- `JWT_SECRET`: Secret key for JWT tokens

## 🧪 Testing

```bash
# Test MySQL connection
npm run test:mysql

# Test Redis connection
npm run test:redis
```

## 📊 Database Setup

The backend expects a MySQL database. To create it:

```sql
CREATE DATABASE crm_marketing;
```

Database schema will be created in Phase 1.4.

## 🐳 Docker

### Build image:
```bash
docker build -t crm-backend .
```

### Run with docker-compose:
```bash
docker-compose up backend
```

## 🔗 API Endpoints

### Health Check
- `GET /health` - Server health status

### API Info
- `GET /api` - API information

More endpoints will be added in Phase 4.

## 📝 Development Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run test:mysql` - Test MySQL connection
- `npm run test:redis` - Test Redis connection
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🔄 Next Steps (Phase 1.3)

- [ ] Integrate with OCR service
- [ ] Set up WAHA webhook receiver
- [ ] Verify shared_media volume access

## 📚 Documentation

- See `IMPLEMENTATION_PLAN.md` for full project roadmap
- See `TODO.md` for current tasks
