const { Worker } = require('bullmq');
const { redisConfig } = require('../config/redis');
const { KnowledgeBase } = require('../models');
const ocrService = require('./ocr.service');
const vectorService = require('./vector.service');
const fs = require('fs');

/**
 * Worker to process Knowledge Base files
 * Flow: OCR Extraction → Text Chunking → Embedding Generation → Vector Storage
 */
const knowledgeWorker = new Worker('knowledge-base-tasks', async (job) => {
  const { fileId } = job.data;
  console.log(`[KnowledgeWorker] Processing file: ${fileId}`);

  const file = await KnowledgeBase.findByPk(fileId);
  if (!file) {
    throw new Error(`File not found: ${fileId}`);
  }

  try {
    // 1. Update status to PROCESSING (just in case)
    await file.update({ status: 'PROCESSING' });

    // 2. Extract text (Directly for TXT, OCR for Images/PDFs)
    console.log(`[KnowledgeWorker] Extracting text for: ${file.originalName}`);
    
    // Check if file exists
    if (!fs.existsSync(file.filePath)) {
        throw new Error(`Physical file not found: ${file.filePath}`);
    }

    let extractedText = '';

    if (file.mimeType === 'text/plain' || file.originalName.endsWith('.txt')) {
      console.log(`[KnowledgeWorker] Reading text file directly: ${file.originalName}`);
      extractedText = fs.readFileSync(file.filePath, 'utf8');
    } else if (file.mimeType === 'application/pdf' || file.originalName.endsWith('.pdf')) {
      console.log(`[KnowledgeWorker] Using OCR for PDF: ${file.originalName}`);
      const ocrResult = await ocrService.scanFile(file.filePath);
      if (!ocrResult.success) {
          throw new Error('OCR extraction failed');
      }
      extractedText = ocrResult.text;
      console.log(`[KnowledgeWorker] OCR result: ${ocrResult.text.substring(0, 200)}...`);
    } else {
      console.log(`[KnowledgeWorker] Using OCR for image: ${file.originalName}`);
      const ocrResult = await ocrService.scanFile(file.filePath);
      if (!ocrResult.success) {
          throw new Error('OCR extraction failed');
      }
      extractedText = ocrResult.text;
      console.log(`[KnowledgeWorker] OCR result: ${ocrResult.text}`);
    }

    if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text content found in file');
    }

    console.log(`[KnowledgeWorker] Extracted ${extractedText.length} characters`);

    // 3. Generate embeddings and store in Redis Vector Store
    console.log(`[KnowledgeWorker] Generating embeddings for: ${file.originalName}`);
    
    const vectorResult = await vectorService.storeDocument({
      userId: file.userId,
      fileId: file.id,
      fileName: file.originalName,
      text: extractedText,
      category: file.metadata?.category || 'document'
    });

    // 4. Update model with processing results
    await file.update({
      status: 'VECTORIZED',
      metadata: {
        ...file.metadata,
        extractedTextLength: extractedText.length,
        textPreview: extractedText.substring(0, 500),
        chunksStored: vectorResult.chunksStored,
        processedAt: new Date().toISOString()
      }
    });

    console.log(`[KnowledgeWorker] ✅ Successfully vectorized: ${file.originalName} (${vectorResult.chunksStored} chunks)`);
    
    // 5. Update Knowledge Summary for the user (ONLY for general documents)
    try {
      if (file.metadata?.category !== 'product') {
        console.log(`[KnowledgeWorker] Updating overall knowledge summary for user: ${file.userId}`);
        const allTexts = await vectorService.getAllTexts(file.userId);
        if (allTexts.length > 0) {
          const aiService = require('./ai.service');
          await aiService.generateKnowledgeSummary(file.userId, allTexts);
          console.log(`[KnowledgeWorker] ✅ Knowledge summary updated for user: ${file.userId}`);
        }
      } else {
        console.log(`[KnowledgeWorker] skipping summary for product: ${file.originalName}`);
      }
    } catch (summaryError) {
      console.error(`[KnowledgeWorker] Failed to update summary:`, summaryError.message);
      // Don't fail the whole job if only summary fails
    }

    // 6. Notify Frontend via Socket.IO
    try {
      const { getIO } = require('./socket.service');
      const io = getIO();
      // Emit event to notify the specific user's frontend
      io.emit('knowledge_update', { 
        userId: file.userId,
        fileId: file.id,
        status: 'VECTORIZED',
        summaryUpdated: true
      });
      console.log(`[KnowledgeWorker] 📡 Emitted knowledge_update event for user: ${file.userId}`);
    } catch (socketError) {
      console.warn('[KnowledgeWorker] Failed to emit socket event (Socket.IO might not be ready yet):', socketError.message);
    }

  } catch (error) {
    console.error(`[KnowledgeWorker] Error processing ${fileId}:`, error);
    await file.update({ 
        status: 'ERROR',
        metadata: { ...file.metadata, lastError: error.message }
    });
    throw error; // Let BullMQ handle retry
  }
}, {
  connection: redisConfig,
  concurrency: 1 // Process one by one to avoid overloading OCR and embedding model
});

knowledgeWorker.on('failed', (job, err) => {
  console.error(`[KnowledgeWorker] Job ${job.id} failed:`, err.message);
});

module.exports = {
  start: () => console.log('📡 Knowledge Worker started'),
  stop: () => knowledgeWorker.close()
};
