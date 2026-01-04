const db = require('./models');
const { initRedis, closeRedis } = require('./config/redis');
const broadcastWorker = require('./services/broadcast.worker');
const schedulerService = require('./services/scheduler.service');
const schedulerWorker = require('./services/scheduler.worker');
const knowledgeWorker = require('./services/knowledge.worker');
const vectorService = require('./services/vector.service');
const replyWorker = require('./services/reply.worker');

async function startServer() {
  try {
    console.log('🚀 Starting Marketing Automation Engine...\n');

    // Initialize Database
    console.log('📊 Initializing MySQL connection (Sequelize)...');
    await db.sequelize.authenticate();
    
    // Sync models (creates tables if they don't exist)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Syncing database models...');
      await db.sequelize.sync({ alter: true });
    }
    
    console.log('✅ Database connected and synced successfully');

    // Initialize Redis
    console.log('\n🔴 Initializing Redis connection...');
    await initRedis();

    // Initialize Vector Service (requires Redis)
    console.log('\n🧠 Initializing Vector Service...');
    await vectorService.initialize();

    // Import app after Redis is ready (for rate limiting store)
    const app = require('./app');
    const http = require('http');
    const { initSocket } = require('./services/socket.service');
    
    const PORT = process.env.PORT || 3000;
    const server = http.createServer(app);
    
    // Initialize Socket.IO
    initSocket(server);

    // Start Workers
    console.log('\n📡 Starting Workers...');
    broadcastWorker.start();
    schedulerWorker.start();
    knowledgeWorker.start();
    replyWorker.start();

    // Initialize Scheduler Jobs
    await schedulerService.initScheduler();

    server.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 Socket.IO enabled`);
      console.log('\n✅ All services initialized successfully!\n');
      console.log('=' .repeat(50));
      console.log('🎉 Marketing Automation Engine is running!');
      console.log('=' .repeat(50));
    });

  } catch (error) {
    console.error('\n❌ Failed to start server:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n⚠️  SIGTERM received. Shutting down gracefully...');
  await broadcastWorker.stop();
  await schedulerWorker.stop();
  await knowledgeWorker.stop();
  await replyWorker.stop();
  await vectorService.close();
  await db.sequelize.close();
  await closeRedis();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n⚠️  SIGINT received. Shutting down gracefully...');
  await broadcastWorker.stop();
  await schedulerWorker.stop();
  await knowledgeWorker.stop();
  await replyWorker.stop();
  await vectorService.close();
  await db.sequelize.close();
  await closeRedis();
  process.exit(0);
});

// Start the server
startServer();
