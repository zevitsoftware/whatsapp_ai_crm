require('dotenv').config();
const { Queue, Worker } = require('bullmq');
const { initRedis, closeRedis, getRedisClient } = require('./src/config/redis');

async function testBullMQ() {
  console.log('🐂 Testing BullMQ Integration...');

  // 1. Initialize Redis connection
  await initRedis();
  const redisConnection = getRedisClient();

  // 2. Create a test queue
  const queueName = 'test-queue';
  const myQueue = new Queue(queueName, { 
    connection: redisConnection 
  });

  // 3. Add a job
  console.log('📥 Adding job to queue...');
  await myQueue.add('test-job', { message: 'Hello BullMQ from Docker!' });

  // 4. Create a worker to process it
  console.log('👷 Starting worker...');
  const worker = new Worker(queueName, async (job) => {
    console.log(`✅ Processing job ${job.id}:`, job.data);
    return 'DONE';
  }, { 
    connection: redisConnection 
  });

  // 5. Wait for completion
  return new Promise((resolve, reject) => {
    worker.on('completed', async (job, returnvalue) => {
      console.log(`🎉 Job ${job.id} completed with result: ${returnvalue}`);
      
      // Cleanup
      await worker.close();
      await myQueue.close();
      await closeRedis();
      resolve();
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ Job ${job.id} failed:`, err);
      reject(err);
    });
  });
}

testBullMQ()
  .then(() => {
    console.log('✅ BullMQ Test Passed!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ BullMQ Test Failed:', err);
    process.exit(1);
  });
