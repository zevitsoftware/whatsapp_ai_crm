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

// Middleware
app.use(helmet());
app.use(cors());
app.use(apiLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enhanced Request/Response Logger
app.use((req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, body, query } = req;

  // Track the original res.json to capture response data
  const originalJson = res.json;
  let responseData;
  res.json = function (body) {
    responseData = body;
    return originalJson.call(this, body);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();
    
    console.log(`\n[${timestamp}] ${method} ${originalUrl} ${res.statusCode} (${duration}ms)`);
    
    if (Object.keys(query).length > 0) {
      console.log('  Query:', JSON.stringify(query));
    }
    
    if (method !== 'GET' && body && Object.keys(body).length > 0) {
      const logBody = { ...body };
      if (logBody.password) logBody.password = '********';
      console.log('  Request Body:', JSON.stringify(logBody));
    }

    if (responseData) {
      const logResponse = { ...responseData };
      if (logResponse.token) logResponse.token = '[REDACTED]';
      const responseStr = JSON.stringify(logResponse);
      const truncated = responseStr.length > 500 ? responseStr.substring(0, 500) + '...' : responseStr;
      console.log('  Response Body:', truncated);
    }
    console.log('--------------------------------------------------');
  });

  next();
});

// Health check endpoint
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
const campaignRoutes = require('./routes/campaign');
const autoReplyRoutes = require('./routes/auto_reply');
const aiProviderRoutes = require('./routes/ai_provider');
const aiRoutes = require('./routes/ai.routes');
const linkRotatorRoutes = require('./routes/link_rotator');
const subscriptionRoutes = require('./routes/subscription');
const ocrRoutes = require('./routes/ocr');
const analyticsRoutes = require('./routes/analytics');
const webhookRoutes = require('./routes/webhooks');
const knowledgeBaseRoutes = require('./routes/knowledge_base');

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
      campaigns: '/api/campaigns',
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
app.use('/api/campaigns', campaignRoutes);
app.use('/api/auto-replies', autoReplyRoutes);
app.use('/api/ai-providers', aiProviderRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/links', linkRotatorRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);

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
