const { Queue } = require('bullmq');
const { redisConfig } = require('../config/redis');

// Queue for Knowledge Base Vectorization
const knowledgeQueue = new Queue('knowledge-base-tasks', {
  connection: redisConfig
});

module.exports = { knowledgeQueue };
