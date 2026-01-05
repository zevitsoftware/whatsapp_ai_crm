const { Queue } = require('bullmq');

const replyQueue = new Queue('reply-queue', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  },
  defaultJobOptions: {
    removeOnComplete: {
      age: 1800, // Keep completed jobs for 30 minutes
      count: 50   // Keep max 50 completed jobs
    },
    removeOnFail: {
      age: 7200   // Keep failed jobs for 2 hours
    }
  }
});

module.exports = replyQueue;
