const Redis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config();

async function testRedisConnection() {
  console.log('🧪 Testing Redis Connection...\n');
  console.log('Configuration:');
  console.log(`  Host: ${process.env.REDIS_HOST || 'localhost'}`);
  console.log(`  Port: ${process.env.REDIS_PORT || 6379}`);
  console.log('');

  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) {
        return null; // Stop retrying
      }
      return Math.min(times * 100, 2000);
    }
  });

  redis.on('connect', () => {
    console.log('📡 Connecting to Redis...');
  });

  redis.on('ready', async () => {
    console.log('✅ Connected to Redis successfully!\n');

    try {
      // Test PING
      console.log('🔍 Testing PING command...');
      const pong = await redis.ping();
      console.log(`✅ PING response: ${pong}\n`);

      // Test SET/GET
      console.log('🔍 Testing SET/GET commands...');
      await redis.set('test:connection', 'Hello from CRM Backend!');
      const value = await redis.get('test:connection');
      console.log(`✅ SET/GET test: ${value}\n`);

      // Test Redis info
      console.log('📊 Redis Server Info:');
      const info = await redis.info('server');
      const lines = info.split('\r\n').filter(line => 
        line.includes('redis_version') || 
        line.includes('os') || 
        line.includes('uptime_in_days')
      );
      lines.forEach(line => console.log(`  ${line}`));

      // Check for Redis Stack modules
      console.log('\n🔍 Checking for Redis Stack modules...');
      const modules = await redis.call('MODULE', 'LIST');
      if (modules.length > 0) {
        console.log('✅ Redis Stack modules loaded:');
        modules.forEach(mod => {
          const name = mod[1];
          console.log(`  - ${name}`);
        });
      } else {
        console.log('⚠️  No modules loaded (using standard Redis)');
      }

      // Clean up test key
      await redis.del('test:connection');

      await redis.quit();
      console.log('\n✅ Redis connection test completed successfully!');
      process.exit(0);

    } catch (error) {
      console.error('\n❌ Redis test failed:', error.message);
      await redis.quit();
      process.exit(1);
    }
  });

  redis.on('error', (err) => {
    console.error('\n❌ Redis connection failed!');
    console.error('Error:', err.message);
    
    if (err.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('  1. Make sure Redis is running');
      console.error('  2. Check if the host and port are correct');
      console.error('  3. Try: docker-compose up redis');
    }
    
    process.exit(1);
  });

  // Timeout after 10 seconds
  setTimeout(() => {
    console.error('\n❌ Connection timeout (10s)');
    redis.disconnect();
    process.exit(1);
  }, 10000);
}

testRedisConnection();
