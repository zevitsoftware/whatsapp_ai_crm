const { pipeline } = require('@xenova/transformers');
const { createClient } = require('redis');

/**
 * Vector Service for Knowledge Base
 * Uses local embeddings (Transformers.js) + Redis Stack Vector Search
 */
class VectorService {
  constructor() {
    this.embedder = null;
    this.redisClient = null;
    this.indexName = 'kb_vectors_v3'; // Upgraded index version for category support
    this.vectorDimension = 384; // all-MiniLM-L6-v2 produces 384-dim vectors
    this.isReady = false;
  }

  /**
   * Initialize the embedding model and Redis connection
   */
  async initialize() {
    if (this.isReady) return;

    try {
      console.log('[VectorService] Initializing local embedding model...');
      
      // Load the embedding pipeline (downloads model on first run)
      // Using all-MiniLM-L6-v2: Fast, lightweight, good for semantic search
      this.embedder = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );

      // Connect to Redis Stack
      this.redisClient = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379
        },
        password: process.env.REDIS_PASSWORD || undefined
      });

      await this.redisClient.connect();
      console.log('[VectorService] Connected to Redis Stack');

      // Create vector index if it doesn't exist
      await this.createVectorIndex();

      this.isReady = true;
      console.log('[VectorService] ✅ Ready for vector operations');
    } catch (error) {
      console.error('[VectorService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create Redis vector search index
   */
  async createVectorIndex() {
    try {
      // Check if index exists
      const indexes = await this.redisClient.sendCommand(['FT._LIST']);
      if (indexes.includes(this.indexName)) {
        console.log(`[VectorService] Index "${this.indexName}" already exists`);
        return;
      }

      // Create index with vector field
      await this.redisClient.sendCommand([
        'FT.CREATE',
        this.indexName,
        'ON', 'HASH',
        'PREFIX', '1', 'kb:',
        'SCHEMA',
        'userId', 'TAG',
        'fileId', 'TAG',
        'category', 'TAG',
        'fileName', 'TEXT',
        'chunkIndex', 'NUMERIC',
        'text', 'TEXT',
        'embedding', 'VECTOR', 'HNSW', '6',
        'TYPE', 'FLOAT32',
        'DIM', this.vectorDimension.toString(),
        'DISTANCE_METRIC', 'COSINE'
      ]);

      console.log(`[VectorService] Created vector index: ${this.indexName}`);
    } catch (error) {
      // Index might already exist, ignore error
      if (!error.message.includes('Index already exists')) {
        console.error('[VectorService] Failed to create index:', error);
      }
    }
  }

  /**
   * Split text into chunks (sentence-based with overlap)
   * @param {string} text - Full text to chunk
   * @param {number} maxChunkSize - Maximum characters per chunk
   */
  chunkText(text, maxChunkSize = 800) {
    const chunks = [];
    const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
    
    let currentChunk = '';
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (!sentence) continue;

      if ((currentChunk + sentence).length > maxChunkSize) {
        if (currentChunk) chunks.push(currentChunk.trim());
        
        // Simple overlap: Include the previous sentence if it exists
        const prevSentence = i > 0 ? sentences[i-1].trim() : '';
        currentChunk = (prevSentence.length < 200 ? prevSentence + ' ' : '') + sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }
    
    if (currentChunk) chunks.push(currentChunk.trim());
    
    return chunks.filter(c => c.length > 20);
  }

  /**
   * Generate embedding vector for text
   * @param {string} text - Text to embed
   * @returns {Float32Array} Embedding vector
   */
  async generateEmbedding(text) {
    if (!this.isReady) {
      await this.initialize();
    }

    const output = await this.embedder(text, {
      pooling: 'mean',
      normalize: true
    });

    // Convert to Float32Array
    return new Float32Array(output.data);
  }

  /**
   * Store document chunks with embeddings in Redis
   * @param {Object} params
   * @param {string} params.userId - User ID
   * @param {string} params.fileId - File ID from KnowledgeBase
   * @param {string} params.fileName - Original file name
   * @param {string} params.text - Full extracted text
   */
  /**
   * Get total number of chunks for a user in a specific category
   * @param {string} userId
   * @param {string} category - 'document' or 'product'
   */
  async getUserChunkCount(userId, category = 'document') {
    if (!this.isReady) await this.initialize();
    
    try {
      const escapedUserId = userId.replace(/-/g, '\\-');
      const queryStr = `@userId:{${escapedUserId}} @category:{${category}}`;
      
      // Use FT.SEARCH with LIMIT 0 0 to get just the count (results[0])
      const results = await this.redisClient.sendCommand([
        'FT.SEARCH',
        this.indexName,
        queryStr,
        'LIMIT', '0', '0'
      ]);
      
      return results[0] || 0;
    } catch (error) {
      console.error('[VectorService] getUserChunkCount failed:', error);
      return 0;
    }
  }

  /**
   * Store document chunks with embeddings in Redis
   * @param {Object} params
   * @param {string} params.userId - User ID
   * @param {string} params.fileId - File ID from KnowledgeBase
   * @param {string} params.fileName - Original file name
   * @param {string} params.text - Full extracted text
   * @param {string} params.category - Storage category ('document' or 'product')
   * @param {number} params.maxChunks - Optional limit override (Default: 7 chunks ~ 5600 chars)
   */
  async storeDocument({ userId, fileId, fileName, text, category = 'document', maxChunks = 7 }) {
    if (!this.isReady) {
      await this.initialize();
    }

    const label = category === 'product' ? 'Product' : 'Document';
    console.log(`[VectorService] Processing ${label}: ${fileName}`);
    
    // 1. Chunk the text
    const chunks = this.chunkText(text);
    console.log(`[VectorService] Created ${chunks.length} chunks`);

    // 2. CHECK LIMITS
    const currentCount = await this.getUserChunkCount(userId, category);
    if (currentCount + chunks.length > maxChunks) {
      const maxChars = maxChunks * 800;
      const typeLabel = category === 'product' ? 'Product Catalog' : 'General Knowledge Base';
      throw new Error(`Storage Limit Exceeded: Your ${typeLabel} allows approx ${maxChars} characters (${maxChunks} chunks). Adding this would exceed your limit. Please delete old ${category === 'product' ? 'products' : 'documents'}.`);
    }

    // 3. Generate embeddings and store each chunk
    const pipeline = this.redisClient.multi();
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await this.generateEmbedding(chunk);
      
      // Create unique key for this chunk
      const key = `kb:${fileId}:${i}`;
      
      // Store as Redis hash
      pipeline.hSet(key, {
        userId,
        fileId,
        category,
        fileName,
        chunkIndex: i.toString(),
        text: chunk,
        embedding: Buffer.from(embedding.buffer)
      });
    }

    await pipeline.exec();
    console.log(`[VectorService] ✅ Stored ${chunks.length} vectors for ${fileName}`);
    
    return { chunksStored: chunks.length, totalChunks: currentCount + chunks.length };
  }

  /**
   * Search for similar text chunks
   * @param {Object} params
   * @param {string} params.userId - User ID to filter results
   * @param {string} params.query - Search query
   * @param {number} params.topK - Number of results to return
   * @returns {Array} Matching chunks with scores
   */
  async searchSimilar({ userId, query, topK = 5 }) {
    if (!this.isReady) {
      await this.initialize();
    }

    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbedding(query);
    const embeddingBlob = Buffer.from(queryEmbedding.buffer);

    try {
      // Perform vector search with user filter
      // Wrapping userId in double quotes within TAG braces to handle hyphens correctly
      const queryStr = `(@userId:{"${userId}"}) => [KNN ${topK} @embedding $embedding_blob AS __embedding_score]`;
      
      console.log(`[VectorService] Searching for chunks matching: "${query.substring(0, 30)}..." for user: ${userId}`);

      const results = await this.redisClient.sendCommand([
        'FT.SEARCH',
        this.indexName,
        queryStr,
        'RETURN', '5', 'fileName', 'text', 'chunkIndex', 'fileId', '__embedding_score',
        'SORTBY', '__embedding_score', 'ASC',
        'LIMIT', '0', topK.toString(),
        'PARAMS', '2', 'embedding_blob', embeddingBlob,
        'DIALECT', '2'
      ]);

      // Parse results
      const numResults = results[0];
      const matches = [];

      for (let i = 1; i < results.length; i += 2) {
        const fields = results[i + 1];
        if (!fields) continue;

        const match = {};
        for (let j = 0; j < fields.length; j += 2) {
          match[fields[j]] = fields[j + 1];
        }
        
        matches.push(match);
      }

      console.log(`[VectorService] Found ${matches.length} matches (Redis internal count: ${numResults})`);
      return matches;

    } catch (error) {
      console.error('[VectorService] Search failed:', error);
      return [];
    }
  }

  /**
   * Delete all vectors for a specific file
   * @param {string} fileId - File ID to delete
   */
  async deleteFileVectors(fileId) {
    if (!this.isReady) {
      await this.initialize();
    }

    try {
      // Find all keys for this file
      const keys = await this.redisClient.keys(`kb:${fileId}:*`);
      
      if (keys.length > 0) {
        await this.redisClient.del(keys);
        console.log(`[VectorService] Deleted ${keys.length} vectors for file ${fileId}`);
      }
      
      return { deletedChunks: keys.length };
    } catch (error) {
      console.error('[VectorService] Delete failed:', error);
      throw error;
    }
  }

  /**
   * Get all text chunks for a user
   * @param {string} userId
   */
  async getAllTexts(userId) {
    if (!this.isReady) await this.initialize();
    
    try {
      // Escape dashes in UUID for RediSearch TAG query
      const escapedUserId = userId.replace(/-/g, '\\-');
      const queryStr = `@userId:{${escapedUserId}}`;
      
      const results = await this.redisClient.sendCommand([
        'FT.SEARCH',
        this.indexName,
        queryStr,
        'RETURN', '1', 'text',
        'LIMIT', '0', '100' // Limit to top 100 chunks for summary
      ]);
      
      const matches = [];
      for (let i = 1; i < results.length; i += 2) {
        const fields = results[i + 1];
        if (fields && fields.length > 1 && fields[0] === 'text') {
            matches.push(fields[1]);
        }
      }
      return matches;
    } catch (error) {
      console.error('[VectorService] getAllTexts failed:', error);
      return [];
    }
  }

  /**
   * Graceful shutdown
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
      console.log('[VectorService] Redis connection closed');
    }
  }
}

// Singleton instance
const vectorService = new VectorService();

module.exports = vectorService;
