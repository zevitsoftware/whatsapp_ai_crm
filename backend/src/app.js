const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { apiLimiter } = require('./middlewares/rate_limit.middleware');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// 1. Enhanced Logger (Place near top to catch all)
app.use((req, res, next) => {
  if (req.originalUrl === '/health') return next();
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// 2. Standard Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https:", "*"],
    },
  },
}));
app.use(cors());
app.use(apiLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Static Files
app.use('/shared_media', express.static('/app/shared_media'));

// 4. Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/device');
const contactRoutes = require('./routes/contact');
const autoReplyRoutes = require('./routes/auto_reply');
const aiProviderRoutes = require('./routes/ai_provider');
const aiRoutes = require('./routes/ai.routes');
const linkRotatorRoutes = require('./routes/link_rotator');
const subscriptionRoutes = require('./routes/subscription');
const ocrRoutes = require('./routes/ocr');
const analyticsRoutes = require('./routes/analytics');
const webhookRoutes = require('./routes/webhooks');
const knowledgeBaseRoutes = require('./routes/knowledge_base');
const locationRoutes = require('./routes/location');

// API Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Marketing Automation Engine API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      devices: '/api/devices',
      contacts: '/api/contacts',
      auto_replies: '/api/auto-replies',
      ai_providers: '/api/ai-providers',
      link_rotators: '/api/links',
      subscriptions: '/api/subscriptions',
      api: '/api',
      ocr: '/api/ocr',
      webhooks: '/webhooks'
    }
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/contacts', contactRoutes);

app.use('/api/auto-replies', autoReplyRoutes);
app.use('/api/ai-providers', aiProviderRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/links', linkRotatorRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/products', require('./routes/product'));
app.use('/api/agent', require('./routes/agent'));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});


module.exports = app;
