const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

let redisClient;

async function initRedis() {
  try {
    redisClient = new Redis(redisConfig);

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
      console.log(`🔗 Host: ${redisConfig.host}:${redisConfig.port}`);
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });

    redisClient.on('ready', () => {
      console.log('🚀 Redis is ready');
    });

    // Test connection
    await redisClient.ping();
    
    return redisClient;
  } catch (error) {
    console.error('❌ Redis initialization failed:', error.message);
    throw error;
  }
}

function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initRedis() first.');
  }
  return redisClient;
}

async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    console.log('🔌 Redis connection closed');
  }
}

module.exports = {
  initRedis,
  getRedisClient,
  closeRedis,
  redisConfig
};
