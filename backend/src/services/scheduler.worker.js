const { Worker } = require('bullmq');
const { redisConfig } = require('../config/redis');
const schedulerService = require('./scheduler.service');

let worker;

exports.start = () => {
  worker = new Worker(
    'scheduler-tasks',
    async (job) => {
      await schedulerService.processScheduledTask(job);
    },
    {
      connection: redisConfig,
      concurrency: 1 // Only one scheduler task at a time
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Scheduled Job ${job.id} (${job.name}) completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Scheduled Job ${job.id} (${job.name}) failed:`, err.message);
  });

  console.log('📡 Scheduler Worker started');
};

exports.stop = async () => {
  if (worker) {
    await worker.close();
    console.log('🛑 Scheduler Worker stopped');
  }
};
