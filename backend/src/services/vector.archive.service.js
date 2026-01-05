const { VectorArchive } = require('../models');
const dayjs = require('dayjs');

/**
 * Hybrid Vector Storage Manager
 * Manages automatic archival of old vectors from Redis to MySQL
 */
class VectorArchiveService {
  constructor() {
    this.ARCHIVE_THRESHOLD_DAYS = 30; // Archive vectors older than 30 days
    this.CACHE_THRESHOLD_DAYS = 7;    // Keep frequently accessed vectors in Redis
  }

  /**
   * Archive old vectors from Redis to MySQL
   * @param {Object} vectorService - Reference to the main VectorService
   */
  async archiveOldVectors(vectorService) {
    try {
      console.log('[VectorArchive] Starting archival process...');
      
      const cutoffDate = dayjs().subtract(this.ARCHIVE_THRESHOLD_DAYS, 'day').toDate();
      const { KnowledgeBase } = require('../models');
      
      // Find old files that should be archived
      const oldFiles = await KnowledgeBase.findAll({
        where: {
          status: 'VECTORIZED',
          updatedAt: {
            [require('sequelize').Op.lt]: cutoffDate
          }
        }
      });

      let archivedCount = 0;
      
      for (const file of oldFiles) {
        const archived = await this.archiveFileVectors(file, vectorService);
        if (archived) archivedCount++;
      }

      console.log(`[VectorArchive] ✅ Archived ${archivedCount} files to MySQL`);
      return archivedCount;
      
    } catch (error) {
      console.error('[VectorArchive] Archival failed:', error);
      throw error;
    }
  }

  /**
   * Archive a single file's vectors from Redis to MySQL
   */
  async archiveFileVectors(file, vectorService) {
    try {
      // Get all Redis keys for this file
      const keys = await vectorService.redisClient.keys(`kb:${file.id}:*`);
      
      if (keys.length === 0) {
        console.log(`[VectorArchive] No Redis vectors found for file ${file.id}`);
        return false;
      }

      // Check if already archived
      const existingArchive = await VectorArchive.findOne({
        where: { fileId: file.id }
      });

      if (existingArchive) {
        console.log(`[VectorArchive] File ${file.id} already archived, skipping`);
        return false;
      }

      const archiveRecords = [];

      // Read each vector from Redis
      for (const key of keys) {
        const data = await vectorService.redisClient.hGetAll(key);
        
        if (!data || !data.text) continue;

        // Convert binary embedding back to array
        const embedding = Array.from(new Float32Array(data.embedding));

        archiveRecords.push({
          id: require('uuid').v4(),
          userId: data.userId,
          fileId: data.fileId,
          fileName: data.fileName,
          chunkIndex: parseInt(data.chunkIndex),
          text: data.text,
          embedding: embedding, // Store as JSON array in MySQL
          lastAccessedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Bulk insert to MySQL
      if (archiveRecords.length > 0) {
        await VectorArchive.bulkCreate(archiveRecords);
        
        // Delete from Redis to free up memory
        await vectorService.redisClient.del(keys);
        
        console.log(`[VectorArchive] ✅ Archived ${archiveRecords.length} vectors for file ${file.originalName}`);
        return true;
      }

      return false;
      
    } catch (error) {
      console.error(`[VectorArchive] Failed to archive file ${file.id}:`, error);
      return false;
    }
  }

  /**
   * Restore archived vectors back to Redis (on-demand)
   * Called when user searches and vectors are not in Redis
   */
  async restoreToRedis(fileId, vectorService) {
    try {
      console.log(`[VectorArchive] Restoring vectors for file ${fileId} to Redis...`);
      
      const archives = await VectorArchive.findAll({
        where: { fileId }
      });

      if (archives.length === 0) {
        console.log(`[VectorArchive] No archived vectors found for file ${fileId}`);
        return false;
      }

      const pipeline = vectorService.redisClient.multi();

      for (const archive of archives) {
        const key = `kb:${archive.fileId}:${archive.chunkIndex}`;
        
        // Convert JSON array back to Float32Array buffer
        const embedding = new Float32Array(archive.embedding);
        
        pipeline.hSet(key, {
          userId: archive.userId,
          fileId: archive.fileId,
          fileName: archive.fileName,
          chunkIndex: archive.chunkIndex.toString(),
          text: archive.text,
          embedding: Buffer.from(embedding.buffer)
        });

        // Update last accessed timestamp
        await archive.update({ lastAccessedAt: new Date() });
      }

      await pipeline.exec();
      
      console.log(`[VectorArchive] ✅ Restored ${archives.length} vectors to Redis`);
      return true;
      
    } catch (error) {
      console.error(`[VectorArchive] Restore failed for file ${fileId}:`, error);
      return false;
    }
  }

  /**
   * Search in MySQL archives (fallback when not in Redis)
   * Uses cosine similarity calculation in JavaScript
   */
  async searchInArchive(userId, queryEmbedding, topK = 5) {
    try {
      // Get all archived vectors for this user
      const archives = await VectorArchive.findAll({
        where: { userId },
        attributes: ['id', 'fileId', 'fileName', 'text', 'chunkIndex', 'embedding']
      });

      if (archives.length === 0) return [];

      // Calculate cosine similarity for each vector
      const results = archives.map(archive => {
        const similarity = this.cosineSimilarity(
          queryEmbedding,
          archive.embedding
        );
        
        return {
          fileName: archive.fileName,
          text: archive.text,
          chunkIndex: archive.chunkIndex,
          fileId: archive.fileId,
          __embedding_score: (1 - similarity).toString() // Convert to distance
        };
      });

      // Sort by similarity (descending) and take top K
      results.sort((a, b) => parseFloat(a.__embedding_score) - parseFloat(b.__embedding_score));
      
      return results.slice(0, topK);
      
    } catch (error) {
      console.error('[VectorArchive] Search in archive failed:', error);
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    const { KnowledgeBase } = require('../models');
    
    const totalFiles = await KnowledgeBase.count({
      where: { status: 'VECTORIZED' }
    });

    const archivedFiles = await VectorArchive.count({
      distinct: true,
      col: 'fileId'
    });

    const totalArchived = await VectorArchive.count();

    return {
      totalFiles,
      archivedFiles,
      activeInRedis: totalFiles - archivedFiles,
      totalArchivedVectors: totalArchived,
      archiveThresholdDays: this.ARCHIVE_THRESHOLD_DAYS
    };
  }
}

module.exports = new VectorArchiveService();
