const express = require('express');
const router = express.Router();
const ocrService = require('../services/ocr.service');
const { verifyWahaSignature } = require('../middlewares/signature.middleware');
const { webhookLimiter } = require('../middlewares/rate_limit.middleware');
const path = require('path');
const { createClient } = require('redis');

// Redis client for deduplication
const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});
redis.connect().catch(console.error);

/**
 * WAHA Webhook Receiver
 * Handles incoming webhook events from WAHA (WhatsApp API)
 */

/**
 * POST /webhooks/waha
 * Main webhook endpoint for WAHA events
 */
router.post('/waha', verifyWahaSignature, webhookLimiter, async (req, res) => {
  try {
    const event = req.body;
    
    console.log('📨 WAHA Webhook received:', {
      event: event.event,
      session: event.session,
      from: event.payload?.from,
      type: event.payload?.type
    });

    // Acknowledge receipt immediately
    res.status(200).json({ 
      success: true, 
      message: 'Webhook received' 
    });

    // Process webhook asynchronously
    processWebhook(event).catch(error => {
      console.error('❌ Webhook processing error:', error);
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Process webhook event asynchronously
 */
async function processWebhook(event) {
  const { event: eventType, payload, session } = event;

  switch (eventType) {
    case 'message':
      await handleIncomingMessage(payload, session);
      break;

    case 'session.status':
      await handleSessionStatus(payload, session);
      break;

    case 'message.ack':
      await handleMessageAck(payload, session);
      break;

    default:
      console.log(`ℹ️  Unhandled event type: ${eventType}`);
  }
}

/**
 * Handle incoming message
 */
async function handleIncomingMessage(payload, session) {
  try {
    const { from, type, body, mediaUrl, id, fromMe } = payload;
    
    // 1. Ignore messages sent by the bot itself
    if (fromMe) {
      // console.log(`⏭️  Ignoring outgoing message: ${id}`);
      return;
    }

    // 2. Atomic Deduplication check using Redis SET NX
    if (id) {
      const lockKey = `msg_lock:${id}`;
      // SET with NX (Only if Not Exists) and EX (Expiration)
      const locked = await redis.set(lockKey, '1', {
        NX: true,
        EX: 60 // 60 seconds lock
      });

      if (!locked) {
        console.log(`⏭️  Skipping duplicate message: ${id}`);
        return;
      }
    }

    console.log(`💬 Message from ${from} (${type}) - ID: ${id}`);

    let messageContent = body || '';

    // Handle media messages with OCR
    if (type === 'image' || type === 'document') {
      console.log(`📸 Media message detected: ${type}`);
      
      if (mediaUrl) {
        try {
          // Extract filename from URL or use a default
          const filename = path.basename(mediaUrl);
          
          // Scan the file using OCR service
          const ocrResult = await ocrService.scanSharedFile(filename);
          
          if (ocrResult.text) {
            console.log(`✅ OCR extracted text: ${ocrResult.text.substring(0, 100)}...`);
            messageContent = ocrResult.text;
          } else {
            console.log('⚠️  No text found in media');
          }
        } catch (error) {
          console.error('❌ OCR processing failed:', error.message);
        }
      }
    }

    // TODO: Process message content
    // - Check blacklist
    // - Match keywords (auto-reply)
    // - AI fallback
    // This will be implemented in Phase 3

    console.log(`📝 Message content: ${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}`);

    // Call ReplyService for unified workflow (Keyword -> AI)
    const replyService = require('../services/reply.service');
    await replyService.processIncoming(session, {
      ...payload,
      body: messageContent // Use OCR text if it was extracted
    });

  } catch (error) {
    console.error('❌ Error handling incoming message:', error);
  }
}

/**
 * Handle session status updates
 */
const { Device } = require('../models');

// ...

/**
 * Handle session status updates
 */
async function handleSessionStatus(payload, session) {
  try {
    const { status } = payload; // Status: 'STOPPED', 'STARTING', 'SCAN_QR', 'WORKING', 'FAILED'
    console.log(`🔄 Session ${session} status: ${status}`);

    const device = await Device.findOne({ where: { sessionName: session } });
    if (device) {
      // Map WAHA status to DB status if needed, or use directly
      device.status = status;
      
      // If WORKING, we might want to capture phone number if available in payload
      // payload might have 'me': { id: '...', pushName: '...' }
      if (status === 'WORKING' && payload.me) {
        // payload.me.id is usually '123456789@c.us'
        const phoneNumber = payload.me.id ? payload.me.id.split('@')[0] : null;
        if (phoneNumber) device.phoneNumber = phoneNumber;
      }
      
      await device.save();
      console.log(`✅ Device ${device.id} status updated to ${status}`);
      
      // Emit socket event for real-time UI updates
      const { emitDeviceStatus } = require('../services/socket.service');
      emitDeviceStatus(session, status, { 
        phoneNumber: device.phoneNumber,
        id: device.id
      });
    } else {
        console.warn(`⚠️  Received status for unknown session: ${session}`);
    }

  } catch (error) {
    console.error('❌ Error handling session status:', error);
  }
}

/**
 * Handle message acknowledgment
 */
async function handleMessageAck(payload, session) {
  try {
    const { id, ack } = payload;
    console.log(`✓ Message ${id} ack: ${ack}`);

    // TODO: Update campaign log status
    // This will be implemented in Phase 3

  } catch (error) {
    console.error('❌ Error handling message ack:', error);
  }
}

/**
 * GET /webhooks/waha/test
 * Test endpoint to verify webhook is working
 */
router.get('/waha/test', (req, res) => {
  res.json({
    success: true,
    message: 'WAHA webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
