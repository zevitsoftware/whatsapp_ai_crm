const { Worker } = require('bullmq');
const { ChatLog, Device, Contact, Product } = require('../models');
const aiService = require('./ai.service');
const wahaService = require('./waha.service');
const spintaxService = require('./spintax.service');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const locationService = require('./location.service');

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined
};

let worker;

const processReply = async (job) => {
  const { session, payload, delayMs } = job.data;
  const { from, body, pushName } = payload;
  const chatId = from;
  const incomingText = body || '';

  // Check if sender is valid (webhook should have normalized LID to @c.us or kept @lid if unmappable)
  // We process it anyway, but prefer @c.us for database consistency
  if (!from.includes('@')) {
     console.log(`[ReplyWorker] Invalid sender format: ${from}`);
     return;
  }

  console.log(`[ReplyWorker] Processing delayed message for ${chatId} (waited ${Math.round(delayMs/1000/60)}m)`);

  try {
    // 1. Get Device & User
    const device = await Device.findOne({ 
      where: { sessionName: session },
      include: ['user']
    });

    if (!device) return;
    const userId = device.userId;

    // 2. Check/Create Contact & AI Policy
    let [contact, created] = await Contact.findOrCreate({
      where: { userId, phoneNumber: from.split('@')[0] },
      defaults: { 
        status: 'active', 
        isAiEnabled: true,
        name: pushName || 'Unknown' 
      }
    });

    // Update name if it was missing or "Unknown" and we have a new pushName
    if (!created && pushName && (!contact.name || contact.name === 'Unknown')) {
      contact.name = pushName;
      await contact.save();
    }

    if (!contact.isAiEnabled) {
      console.log(`[ReplyWorker] AI is disabled for contact ${chatId}. CS may have taken over.`);
      return;
    }

    // 3. Save Incoming Message to History (Always save user message first)
    await ChatLog.create({
      userId,
      deviceId: device.id,
      chatId,
      role: 'user',
      message: incomingText
    });

    // 4. Location Gatekeeper & Logic
    const currentLoc = contact.attributes?.location;
    let hasLocation = currentLoc && currentLoc !== 'Unknown';

    if (!hasLocation) {
      // === HYBRID IDENTITY EXTRACTION ===
      
      // STEP 1: Fast Pass - Regex + DB
      const detectedLoc = await locationService.detectLocation(incomingText);
      
      // Try to extract name: "Saya [Name]" or "Nama saya [Name]"
      // Ignore common honorifics and greetings
      const nameMatch = incomingText.match(/(?:saya|nama saya|nama ku|aku|dengan|namaku) (?:adalah\s)?([a-zA-Z\s]+?)(?:\s+dari|\s+di|\s+dan|\s+yang|$)/i);
      let detectedName = nameMatch ? nameMatch[1].trim() : null;

      // Validate extracted name - reject if it's just an honorific or location word
      const invalidNames = ['kakak', 'kak', 'bang', 'mas', 'mba', 'mbak', 'tante', 'om', 'pak', 'bu', 'ibu', 'bapak', 'kota', 'dari'];
      if (detectedName && invalidNames.includes(detectedName.toLowerCase())) {
        detectedName = null;
      }

      // FALLBACK: If location found but no name prefix, try to split "Name City"
      if (!detectedName && detectedLoc && incomingText.split(/\s+/).length >= 2) {
        const words = incomingText.split(/\s+/);
        const matchedPart = detectedLoc.matchedPart.toLowerCase();
        
        // Filter out the word that matched the location and common stopwords
        const stopWords = ['halo', 'hai', 'dari', 'kota', 'dengan', 'saya', 'nama', 'kakak', 'kak', 'ya', 'bang', 'mas', 'mba', 'mbak', 'tante', 'om', 'di', 'pak', 'bu', 'ibu', 'bapak'];
        
        const nameParts = words.filter(w => {
          const wLower = w.toLowerCase();
          return !matchedPart.includes(wLower) && !stopWords.includes(wLower) && w.length > 1;
        });

        if (nameParts.length > 0) {
          detectedName = nameParts.join(' ');
        }
      }

      // STEP 2: AI Smart Extraction (if regex failed to find name OR location)
      if (!detectedName || !detectedLoc) {
        console.log(`[ReplyWorker] Regex extraction incomplete, trying AI fallback...`);
        const aiExtracted = await aiService.extractIdentity(incomingText);
        
        // Use AI-extracted name if we don't have one
        if (!detectedName && aiExtracted.name) {
          detectedName = aiExtracted.name;
          console.log(`[ReplyWorker] 🤖 AI extracted name: ${detectedName}`);
        }

        // If AI found a city and we don't have one, verify it against DB
        if (!detectedLoc && aiExtracted.city) {
          const verifiedLoc = await locationService.detectLocation(aiExtracted.city);
          if (verifiedLoc) {
            console.log(`[ReplyWorker] 🤖 AI extracted city verified: ${verifiedLoc.name}`);
            detectedLoc = verifiedLoc; // Assign the verified location
          }
        }
      }

      let contactUpdated = false;

      if (detectedName && detectedName.length > 2 && detectedName.length < 30) {
        // Only update if current name is Unknown or looks like a phone number
        console.log(`[ReplyWorker] 👤 Discovered name for ${chatId}: ${detectedName}`);
        contact.name = detectedName;
        contactUpdated = true;
      }
      
      if (detectedLoc) {
        console.log(`[ReplyWorker] 📍 Discovered location for ${contact.name}: ${detectedLoc.name}`);
        const newAttrs = { ...(contact.attributes || {}), location: detectedLoc.name, locationData: detectedLoc };
        contact.attributes = newAttrs;
        contact.changed('attributes', true);
        contactUpdated = true;
        hasLocation = true;
      }

      if (contactUpdated) {
        await contact.save();
      }

      if (!hasLocation) {
        // LOCATION NOT FOUND -> BLOCK AI & ASK MANUALLY
        console.log(`[ReplyWorker] Location unknown for ${chatId}, stopping AI and asking for location.`);
        
        // Helper for time-based advice
        const hour = new Date().getHours() + 7; // Simple UTC+7 adjustment
        const effectiveHour = hour % 24;
        let greeting = 'pagi';
        if (effectiveHour >= 10 && effectiveHour < 15) greeting = 'siang';
        else if (effectiveHour >= 15 && effectiveHour < 18) greeting = 'sore';
        else if (effectiveHour >= 18 || effectiveHour < 4) greeting = 'malam';

        const templateMessage = `Halo, selamat ${greeting}, dengan siapa dan dari kota mana ya kak?? ada yg bisa kami bantu?`;

        // Send Template
        await wahaService.sendSeen(session, chatId);
        await wahaService.startTyping(session, chatId);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Natural typing delay
        await wahaService.stopTyping(session, chatId);
        
        // Process spintax if valid (though this template is static, good practice)
        const finalTemplate = spintaxService.processMessage(templateMessage, { name: pushName });
        await wahaService.sendText(session, { chatId, text: finalTemplate });

        // Save Assistant Message to History (so AI has context next time)
        await ChatLog.create({
          userId,
          deviceId: device.id,
          chatId,
          role: 'assistant',
          message: finalTemplate
        });

        return; // <--- STOP HERE, DO NOT CALL AI
      }
    }

    // 4b. CHECK IGNORE STATUS
    const attributes = contact.attributes || {};
    if (attributes.ignoreUntil) {
      const ignoreTime = new Date(attributes.ignoreUntil);
      if (new Date() < ignoreTime) {
        console.log(`[ReplyWorker] Ignoring ${chatId} until ${attributes.ignoreUntil} (Cooling down)`);
        return;
      } else {
        // Expired? Clear it
        attributes.ignoreUntil = null;
        attributes.consecutiveUnknownCount = 0;
        contact.attributes = attributes;
        contact.changed('attributes', true);
        await contact.save();
      }
    }

    // 5. Fetch History (Last 10 messages)
    const history = await ChatLog.findAll({
      where: { chatId },
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    // Reverse to get chronological order for AI
    const conversationHistory = history.reverse().map(h => ({
      role: h.role,
      content: h.message
    }));

    // 6. Check "Flood" Logic (every 10th response)
    const assistantReplyCount = await ChatLog.count({
      where: { chatId, role: 'assistant' }
    });
    
    let isFloodWarningNeeded = (assistantReplyCount > 0 && (assistantReplyCount + 1) % 10 === 0);

    // 7. Generate AI Response with Context
    let responseText = await aiService.generateResponse(userId, contact, incomingText, true, conversationHistory);
    
    if (!responseText) return;

    // --- OFF-TOPIC / UNKNOWN HANDLING LOGIC ---
    // Check if AI response indicates "Information Not Found" (based on our system prompt fallback)
    const isUnknownResponse = responseText.includes("belum tersedia di sistem kami");

    if (isUnknownResponse) {
       let count = attributes.consecutiveUnknownCount || 0;
       count++;
       
       console.log(`[ReplyWorker] Unknown response detected for ${chatId}. Count: ${count}`);

       if (count >= 2) {
          // Threshold reached: Send "Busy/Ignore" message
          responseText = "Mohon maaf Kak, karena antrian pertanyaan sedang sangat padat dan pertanyaan Kakak memerlukan pengecekan manual yang lebih detail, kami akan segera kembali menghubungi Kakak dalam beberapa jam ke depan. Mohon kesediaannya menunggu ya, Kak. 🙏 Terima kasih!";
          
          // Set ignore for 3 hours
          attributes.ignoreUntil = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
          attributes.consecutiveUnknownCount = 0; // Reset for next time
          
          console.log(`[ReplyWorker] Ignored ${chatId} for 3 hours due to repeated off-topic questions.`);
       } else {
          // Just increment count
          attributes.consecutiveUnknownCount = count;
       }
       
       contact.attributes = attributes;
       contact.changed('attributes', true);
       await contact.save();

    } else {
       // Valid response? Reset count if it was > 0
       if (attributes.consecutiveUnknownCount > 0) {
         attributes.consecutiveUnknownCount = 0;
         contact.attributes = attributes;
         contact.changed('attributes', true);
         await contact.save();
       }
    }
    // -------------------------------------------

    // Append flood apology if it's the 10th message
    if (isFloodWarningNeeded && !attributes.ignoreUntil) { // Don't append if we just ignored them
      responseText += "\n\n(Mohon maaf jika respon kami sedikit melambat dikarenakan antrian chat yang sedang padat. Kami akan segera membantu Kakak sebaik mungkin!)";
    }

    // 8. Save Assistant Message to History
    await ChatLog.create({
      userId,
      deviceId: device.id,
      chatId,
      role: 'assistant',
      message: responseText
    });

    // 9. Send to WhatsApp with Delays & Formatting
    const finalMessage = spintaxService.processMessage(responseText, {
      name: pushName || 'User',
      phone: from.split('@')[0]
    });

    // Helper for natural delays
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const sendWithHumanTouch = async (content, type = 'text', isLastPart = false) => {
       await wahaService.sendSeen(session, chatId);
       await wahaService.startTyping(session, chatId);
       
       // Random typing delay (2-5 seconds based on length)
       const typingMs = Math.max(2000, Math.min(5000, content.length * 15));
       await sleep(typingMs);
       
       await wahaService.stopTyping(session, chatId);
       
       if (type === 'image') {
          await wahaService.sendImage(session, content);
       } else {
          await wahaService.sendText(session, { chatId, text: content });
       }
       
       if (!isLastPart) {
          // Rule 54: Wait between messages
          const interMessageDelay = Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000; // 15-30s
          console.log(`[ReplyWorker] Message sent. Waiting ${Math.round(interMessageDelay/1000)}s before next...`);
          await sleep(interMessageDelay);
       }
    };
    
    // --- SMART PRODUCT CARD HANDLER ---
    const parts = finalMessage.split(/(\[PRODUCT_CARD: [a-f0-9-]+\])/g).filter(p => p.trim() !== '');
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const trimmedPart = part.trim();
      const isLastPart = (i === parts.length - 1);
      
      const cardMatch = trimmedPart.match(/\[PRODUCT_CARD: ([a-f0-9-]+)\]/);
      if (cardMatch) {
         const productId = cardMatch[1];
         try {
            const product = await Product.findByPk(productId);
            if (product && product.imagePath) {
               const cleanPath = product.imagePath.startsWith('/') ? product.imagePath.substring(1) : product.imagePath;
               const diskPath = path.join('/app', cleanPath);
               
               if (fs.existsSync(diskPath)) {
                  const caption = `*${product.title}*\n\nHarga: *Rp ${Number(product.price).toLocaleString('id-ID')}*\n\n${product.description || ''}`;
                  
                  console.log(`[ReplyWorker] Compressing image: ${diskPath}`);
                  const compressedBuffer = await sharp(diskPath)
                     .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                     .jpeg({ quality: 80 })
                     .toBuffer();
                  
                  await sendWithHumanTouch({
                     chatId,
                     file: {
                        data: compressedBuffer.toString('base64'),
                        mimetype: 'image/jpeg',
                        filename: `${product.title.replace(/\s+/g, '_')}.jpg`
                     },
                     caption: caption
                  }, 'image', isLastPart);
               } else {
                  console.warn(`[ReplyWorker] Product image not found at ${diskPath}`);
               }
            }
         } catch (err) {
            console.error(`[ReplyWorker] Failed to process product card:`, err);
         }
      } else {
         // Determine if we should wait a long time or short time
         // If this is text AND the NEXT part is an image, use a short delay (3-7s)
         await wahaService.sendSeen(session, chatId);
         await wahaService.startTyping(session, chatId);
         const typingMs = Math.max(2000, Math.min(5000, trimmedPart.length * 15));
         await sleep(typingMs);
         await wahaService.stopTyping(session, chatId);
         await wahaService.sendText(session, { chatId, text: trimmedPart });

         if (!isLastPart) {
            const nextPart = parts[i+1];
            const nextIsCard = nextPart.includes('[PRODUCT_CARD:');
            
            const delay = nextIsCard 
               ? Math.floor(Math.random() * (10000 - 7000 + 1)) + 7000 // Fast (7-10s)
               : Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000; // Human (15-30s)
            
            console.log(`[ReplyWorker] Part sent. Waiting ${Math.round(delay/1000)}s before next bubble...`);
            await sleep(delay);
         }
      }
    }

    console.log(`[ReplyWorker] Full rich reply flow completed for ${chatId}.`);

  } catch (error) {
    console.error('[ReplyWorker] Error:', error);
  }
};

module.exports = {
  start: () => {
    worker = new Worker('reply-queue', processReply, { 
      connection,
      autorun: true 
    });
    console.log('[ReplyWorker] Worker started and listening...');
  },
  stop: async () => {
    if (worker) {
      await worker.close();
      console.log('[ReplyWorker] Worker stopped.');
    }
  }
};
