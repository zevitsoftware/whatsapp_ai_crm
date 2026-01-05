const { Queue } = require('bullmq');
const { redisConfig } = require('../config/redis');

// Queue for Knowledge Base Vectorization
const knowledgeQueue = new Queue('knowledge-base-tasks', {
  connection: redisConfig,
  defaultJobOptions: {
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 100  // Keep max 100 completed jobs
    },
    removeOnFail: {
      age: 86400  // Keep failed jobs for 24 hours for debugging
    }
  }
});

module.exports = { knowledgeQueue };
