const { Queue } = require('bullmq');

const replyQueue = new Queue('reply-queue', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  }
});

module.exports = replyQueue;
