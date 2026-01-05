const { Queue } = require('bullmq');
const { redisConfig } = require('../config/redis');
const { User, KnowledgeBase } = require('../models');
const { Op } = require('sequelize');
const { knowledgeQueue } = require('./knowledge.queue');
const dayjs = require('dayjs');

// Queue for scheduled tasks
const schedulerQueue = new Queue('scheduler-tasks', {
  connection: redisConfig,
  defaultJobOptions: {
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 1 day
      count: 200   // Keep max 200 completed jobs
    },
    removeOnFail: {
      age: 172800  // Keep failed jobs for 2 days
    }
  }
});

/**
 * Initialize all repeatable jobs
 */
exports.initScheduler = async () => {
  try {
    console.log('🗓️  Initializing Scheduler Service...');

    // 1. Clear existing repeatable jobs to avoid duplicates on restart
    const repeatableJobs = await schedulerQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await schedulerQueue.removeRepeatableByKey(job.key);
    }

    // 2. Add Subscription Expiry Check (Every Hour)
    await schedulerQueue.add(
      'check-subscriptions', 
      {}, 
      {
        repeat: { pattern: '0 * * * *' }, // Every hour at minute 0
        jobId: 'check-subscriptions'
      }
    );

    // 4. Add Knowledge Base Pending Check (Every 15 minutes)
    await schedulerQueue.add(
      'check-pending-kb',
      {},
      {
        repeat: { pattern: '*/15 * * * *' },
        jobId: 'check-pending-kb'
      }
    );

    // 5. Add Vector Archival (Daily at 2 AM)
    await schedulerQueue.add(
      'archive-vectors',
      {},
      {
        repeat: { pattern: '0 2 * * *' }, // Every day at 2 AM
        jobId: 'archive-vectors'
      }
    );

    console.log('✅ Scheduler Service initialized with 3 repeatable jobs');
  } catch (error) {
    console.error('❌ Scheduler Initialization Error:', error);
  }
};

/**
 * Process scheduled tasks
 * This can be run in the same worker or a separate one.
 * I'll define the logic here and call it from a worker.
 */
exports.processScheduledTask = async (job) => {
  const { name } = job;
  console.log(`🕒 Processing scheduled task: ${name}`);

  switch (name) {
    case 'check-subscriptions':
      await handleSubscriptionExpiry();
      break;
    case 'cleanup-logs':
      await handleLogCleanup();
      break;
    case 'check-pending-kb':
      await handlePendingKnowledgeBase();
      break;
    case 'archive-vectors':
      await handleVectorArchival();
      break;
    default:
      console.warn(`ℹ️  Unknown scheduled task: ${name}`);
  }
};

/**
 * Update users whose subscription has expired
 */
async function handleSubscriptionExpiry() {
  try {
    const now = new Date();
    const expiredUsers = await User.update(
      { subscriptionStatus: 'EXPIRED' },
      {
        where: {
          subscriptionStatus: 'ACTIVE',
          subscriptionExpiresAt: {
            [Op.lt]: now
          }
        }
      }
    );
    console.log(`✅ Subscription check complete. Updated ${expiredUsers[0]} users to EXPIRED.`);
  } catch (error) {
    console.error('❌ Subscription Expiry Check Error:', error);
  }
}

/**
 * Cleanup old records (Campaign logs older than 30 days)
 */
async function handleLogCleanup() {
  try {
    // Logic for database cleanup could go here
    console.log('✅ Log cleanup complete (Mocked)');
  } catch (error) {
    console.error('❌ Log Cleanup Error:', error);
  }
}
/**
 * Find files stuck in PROCESSING and re-queue them
 */
async function handlePendingKnowledgeBase() {
  try {
    const pendingFiles = await KnowledgeBase.findAll({
      where: {
        status: 'PROCESSING',
        updatedAt: {
          [Op.lt]: dayjs().subtract(30, 'minute').toDate()
        }
      }
    });

    if (pendingFiles.length > 0) {
      console.log(`[Scheduler] Found ${pendingFiles.length} stuck Knowledge Base files. Re-queuing...`);
      for (const file of pendingFiles) {
        await knowledgeQueue.add('vectorize-file', {
          fileId: file.id,
          userId: file.userId
        });
      }
    }
  } catch (error) {
    console.error('❌ Pending KB Check Error:', error);
  }
}

/**
 * Archive old vectors from Redis to MySQL
 */
async function handleVectorArchival() {
  try {
    const vectorService = require('./vector.service');
    const vectorArchiveService = require('./vector.archive.service');
    
    const archivedCount = await vectorArchiveService.archiveOldVectors(vectorService);
    
    console.log(`✅ Vector archival complete. Archived ${archivedCount} files.`);
  } catch (error) {
    console.error('❌ Vector Archival Error:', error);
  }
}
