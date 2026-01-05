const { AiProvider, AiModelSpec, Product, AgentConfig, sequelize } = require('../models');
const axios = require('axios');
const { Op } = require('sequelize');
const vectorService = require('./vector.service');

class AIService {
  /**
   * Get best available AI provider
   * Priority: Docker Native > DB Priorities
   */
  async getAvailableProvider() {
    // 1. Try DB providers first (GROQ, Gemini, etc.)
    const providers = await AiProvider.findAll({
      where: { isActive: true },
      order: [['priority', 'DESC'], [sequelize.col('dailyUsed'), 'ASC']]
    });

    for (const p of providers) {
      if (p.dailyUsed < p.dailyLimit) {
        return p;
      }
    }

    // 2. Fallback to Docker Model Runner (Native) if all providers exhausted
    if (process.env.LOCAL_AI_URL) {
      console.log('[AIService] All online providers exhausted, using Docker Native fallback');
      return {
        id: 'docker-native',
        name: 'Docker Model Runner',
        model: process.env.LOCAL_AI_MODEL || 'ai/qwen2.5:1.5B-F16',
        endpoint: process.env.LOCAL_AI_URL,
        apiKey: 'docker',
        priority: 0,
        save: async () => {}, // Mock save for native
        dailyUsed: 0,
        monthlyUsed: 0
      };
    }

    return null;
  }

  /**
   * Main method to generate AI response with RAG
   * @param {string} userId - User ID for context filtering
   * @param {string} text - User's message/question
   * @param {boolean} useKnowledgeBase - Whether to use RAG (default: true)
   */
  async generateResponse(userId, contact, text, useKnowledgeBase = true, history = []) {
    // 1. Retrieve relevant context from knowledge base (RAG) - do this once
    let context = '';
    if (useKnowledgeBase) {
      const relevantChunks = await vectorService.searchSimilar({
        userId,
        query: text,
        topK: 12
      });

      if (relevantChunks.length > 0) {
        context = '\n\nRelevant information from knowledge base:\n' + 
                  relevantChunks.map((chunk, i) => 
                    `[${i + 1}] ${chunk.text}`
                  ).join('\n\n');
        
        console.log(`[AIService] Found ${relevantChunks.length} relevant knowledge chunks`);
      } else {
        console.log(`[AIService] No relevant context found for: "${text}". Proceeding with empty context...`);
        context = ''; 
      }
    }

    // 2. Retrieve Official Products Directly (Priority Context)
    let productCatalogContext = '';
    try {
      const products = await Product.findAll({
        where: { userId },
        limit: 15,
        order: [['isPrimary', 'DESC'], ['updatedAt', 'DESC']]
      });

      if (products.length > 0) {
        productCatalogContext = 'DAFTAR PRODUK RESMI SAAT INI (Katalog):\n' + 
          products.map((p, i) => 
            `ID: ${p.id}\n- Nama: ${p.title}\n- Harga: Rp ${Number(p.price).toLocaleString('id-ID')}\n- Promo: ${p.discount ? p.discount : 'Normal'}\n- Deskripsi: ${p.description || '-'}\n- Primary: ${p.isPrimary ? 'Ya' : 'Tidak'}`
          ).join('\n---\n');
      }
    } catch (productErr) {
      console.error('[AIService] Failed to fetch products for context:', productErr);
    }

    // 3. Prepare User Info
    const contactLocation = contact?.attributes?.location || 'Unknown';
    const contactName = contact?.name || 'Unknown';
    
    // 3.5. Fetch User Custom Agent Prompt
    let basePrompt = '';
    try {
      const config = await AgentConfig.findOne({ where: { userId, isActive: true } });
      if (config && config.customPrompt) {
        basePrompt = config.customPrompt;
      }
    } catch (err) {
      console.error('[AIService] Failed to fetch agent config:', err);
    }

    // Default Fallback Template (Standard Sales Brain)
    const defaultTemplate = `Anda adalah Sales Assistant Resmi yang ramah, profesional, dan fokus pada penjualan (closing).
Tugas Anda adalah melayani calon customer, menjawab pertanyaan produk, dan membantu mereka melakukan pembelian.

INFORMASI USER SAAT INI:
- Nama: \${contactName}
- Lokasi/Kota: \${contactLocation}

PEDOMAN INTERAKSI & FORMAT:
1. SAPAAN & IDENTITAS:
   - Mulailah dengan sapaan hangat yang natural.
   - Panggilan: Gunakan "Kak".

2. FORMAT DAFTAR PRODUK (PENTING):
   - JANGAN PERNAH gunakan format TABLE (Tabel Markdown).
   - Gunakan format LIST sederhana dengan baris baru (\\n) agar mudah dibaca di WhatsApp/Chat.
   - Contoh List:
     1. Nama Produk - Rp Harga
     2. Nama Produk - Rp Harga

3. PENJELASAN PRODUK SPESIFIK & FOLLOW-UP:
   - Jika user bertanya detail tentang satu produk spesifik, ikuti struktur ini:
     1. Kalimat pembuka singkat.
     2. Gunakan marker khusus di baris BARU: [PRODUCT_CARD: masukkan_id_produk_disini]
     3. WAJIB BERIKAN PENJELASAN (2-3 kalimat) setelah marker tersebut. Jelaskan manfaat mendalam, keunggulan, atau cara pakai berdasarkan BASIS PENGETAHUAN.
     4. Sebutkan promo/diskon jika ada.
     5. Akhiri dengan pertanyaan memancing (Closing).
   - Pastikan harga disebutkan dengan TEKS TEBAL (contoh: **Rp 50.000**).

4. GALI KEBUTUHAN & closing:
   - Dengarkan kebutuhan mereka.
   - Gunakan DAFTAR PRODUK RESMI di bawah sebagai acuan stok & harga.
   - Gunakan BASIS PENGETAHUAN untuk detail teknis dan edukasi.
   - Jangan hanya kasih link/gambar, tapi jelaskan KENAPA produk ini cocok untuk mereka.
   - Selalu tanyakan: "Apakah Kakak ingin mencoba produk ini sekarang?" atau "Mau kami pesankan dulu Kak?"

5. **ATURAN KETAT**:
   - Anda HANYA boleh menjawab berdasarkan data di bawah.
   - DILARANG menggunakan format Tabel Markdown.
   - Jika tidak ada di data, katakan tidak tersedia dengan sopan.`;

    let finalSystemPrompt = basePrompt || defaultTemplate;

    // Replace variables in templates
    finalSystemPrompt = finalSystemPrompt
      .replace(/\${contactName}/g, contactName)
      .replace(/\${contactLocation}/g, contactLocation);

    const systemPrompt = `${finalSystemPrompt}

${productCatalogContext ? `--- DAFTAR PRODUK RESMI ---\n${productCatalogContext}\n\n` : ''}
${context ? '--- BASIS PENGETAHUAN (DETAIL & EDUKASI) ---\n' + context + '\n--- AKHIR BASIS PENGETAHUAN ---' : '--- BASIS PENGETAHUAN ---\n(Kosong)\n--- AKHIR BASIS PENGETAHUAN ---'}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(msg => ({ 
        role: msg.role === 'assistant' ? 'assistant' : 'user', 
        content: msg.content 
      })).filter(msg => msg.content !== text)
    ];
    messages.push({ role: 'user', content: text });

    // 3. Try all providers with failover
    const providers = await AiProvider.findAll({
      where: { isActive: true },
      order: [['priority', 'DESC'], [sequelize.col('dailyUsed'), 'ASC']]
    });

    // Add Docker Native as final fallback
    if (process.env.LOCAL_AI_URL) {
      providers.push({
        id: 'docker-native',
        name: 'Docker Model Runner',
        model: process.env.LOCAL_AI_MODEL || 'ai/qwen2.5:1.5B-F16',
        endpoint: process.env.LOCAL_AI_URL,
        apiKey: 'docker',
        priority: -1,
        dailyUsed: 0,
        dailyLimit: 999999,
        save: async () => {}
      });
    }

    for (const provider of providers) {
      // Skip if quota exceeded (except Docker Native)
      if (provider.id !== 'docker-native' && provider.dailyUsed >= provider.dailyLimit) {
        continue;
      }

      try {
        console.log(`[AIService] Trying provider: ${provider.name}`);
        
        let endpoint = provider.endpoint || 'https://api.openai.com/v1/chat/completions';
        
        let response;
        const limits = await this.getModelLimits(provider.model);
        
        // Handle Google Gemini Native API
        if (provider.name.includes('Google Gemini') && !endpoint.includes('openai')) {
           // Native Google API logic
           const googleEndpoint = `${endpoint}/models/${provider.model}:generateContent?key=${provider.apiKey}`;
           
           // Convert messages to Google format
           const googleContents = messages.map(msg => {
             if (msg.role === 'system') return null; // Google doesn't use 'system' role in contents, uses systemInstruction usually, or just merged. 
             // Simple fallback: merge system into first user message or use 'user' role
             return {
               role: msg.role === 'assistant' ? 'model' : 'user',
               parts: [{ text: msg.content }]
             };
           }).filter(Boolean);

           // Handle system prompt separately if needed, or prepend to first message
           const systemMsg = messages.find(m => m.role === 'system');
           if (systemMsg) {
              // Prepend to start if possible, or use system_instruction if supported in v1beta
              // For v1beta/models/gemini-pro:generateContent, system_instruction is supported
           }

           const payload = {
             contents: googleContents,
             system_instruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
             generationConfig: {
               maxOutputTokens: limits.maxOutput,
               temperature: 0.7
             }
           };

           console.log(`[AIService] Google Request URL: ${googleEndpoint}`);
           // console.log(`[AIService] Google Payload: ${JSON.stringify(payload)}`);

           response = await axios.post(googleEndpoint, payload, {
             headers: { 'Content-Type': 'application/json' },
             timeout: 30000
           });
           
           // Format response to match OpenAI structure for easier handling below
           const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
           response.data = { choices: [{ message: { content: text } }] };

        } else {
           // Standard OpenAI Compatible API
           if (provider.id === 'docker-native' && !endpoint.endsWith('/chat/completions')) {
             endpoint = endpoint.endsWith('/') ? `${endpoint}chat/completions` : `${endpoint}/chat/completions`;
           }

           const payload = {
             model: provider.model,
             messages: messages,
             max_tokens: limits.maxOutput,
             temperature: 0.7
           };

           const headers = {
             'Content-Type': 'application/json'
           };
           
           // Only add Bearer token if not Google (Google uses query param or different auth) 
           // BUT if it's OpenAI compatible Google, it might use Bearer.
           // Standard OpenAI/OpenRouter/Groq uses Bearer.
           if (provider.apiKey && provider.apiKey !== 'docker') {
              headers['Authorization'] = `Bearer ${provider.apiKey}`;
           }

           response = await axios.post(endpoint, payload, {
             headers,
             timeout: 30000
           });
        }

        let content = response.data.choices[0].message.content.trim();
        content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        
        // Success! Increment usage and return
        if (provider.id !== 'docker-native') {
          await this.incrementUsage(provider);
        }
        
        console.log(`[AIService] ✅ Response generated by ${provider.name}`);
        return content;

      } catch (error) {
        console.error(`[AIService] ${provider.name} failed:`, error.response?.data || error.message);
        // Continue to next provider
      }
    }

    // All providers failed
    console.error('[AIService] All providers failed');
    return null;
  }

  /**
   * Extract name and city from text using LOCAL AI only (Docker Native)
   * This is used as a fallback when regex/DB methods fail
   * @param {string} text - User's message
   * @returns {Object} { name: string|null, city: string|null }
   */
  async extractIdentity(text) {
    try {
      // Only use Docker Native for this task (no API costs)
      if (!process.env.LOCAL_AI_URL) {
        console.warn('[AIService] Docker Native not available for identity extraction');
        return { name: null, city: null };
      }

      const provider = {
        id: 'docker-native',
        name: 'Docker Model Runner',
        model: process.env.LOCAL_AI_MODEL || 'ai/qwen2.5:1.5B-F16',
        endpoint: process.env.LOCAL_AI_URL,
        apiKey: 'docker'
      };

      let endpoint = provider.endpoint;
      if (!endpoint.endsWith('/chat/completions')) {
        endpoint = endpoint.endsWith('/') ? `${endpoint}chat/completions` : `${endpoint}/chat/completions`;
      }

      const systemPrompt = `You are a data extraction assistant. Extract the person's name and city from Indonesian text.
Return ONLY valid JSON in this exact format:
{"name": "extracted name or null", "city": "extracted city or null"}

Rules:
- If no name is found, use null
- If no city is found, use null
- City should be the actual city name (e.g., "Jakarta", "Surabaya", "Solo")
- Do not include greetings or extra text
- Return ONLY the JSON object`;

      const payload = {
        model: provider.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract from: "${text}"` }
        ],
        max_tokens: 100,
        temperature: 0.1 // Low temperature for consistent extraction
      };

      const response = await axios.post(endpoint, payload, {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      let content = response.data.choices[0].message.content.trim();
      
      // Try to parse JSON response
      try {
        // Remove markdown code blocks if present
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        const extracted = JSON.parse(content);
        
        console.log(`[AIService] Extracted identity:`, extracted);
        return {
          name: extracted.name || null,
          city: extracted.city || null
        };
      } catch (parseError) {
        console.warn('[AIService] Failed to parse AI extraction response:', content);
        return { name: null, city: null };
      }

    } catch (error) {
      console.error('[AIService] Identity extraction failed:', error.message);
      return { name: null, city: null };
    }
  }

  /**
   * Increment usage counters
   */
  async incrementUsage(provider) {
    // 1. DB Counters
    provider.dailyUsed += 1;
    provider.monthlyUsed += 1;
    await provider.save();

    // 2. Redis Real-Time Counters (RPM)
    try {
      const { getRedisClient } = require('../config/redis');
      const redis = getRedisClient();
      const rpmKey = `ai:limit:rpm:${provider.id}`;
      
      const currentCount = await redis.incr(rpmKey);
      if (currentCount === 1) {
        await redis.expire(rpmKey, 60);
      }
    } catch (err) {
      console.warn('[AIService] Failed to update Redis stats:', err.message);
    }
  }

  /**
   * Summarize the entire knowledge base for a user
   * @param {string} userId
   * @param {Array<string>} chunks - Texts to summarize
   */
  async generateKnowledgeSummary(userId, chunks) {
    try {
      const provider = await this.getAvailableProvider();
      if (!provider) {
        console.warn('[AIService] No AI providers available for summary');
        return null;
      }

      // Limit characters to avoid token issues, but enough for a good summary
      const combinedText = chunks.join('\n\n').substring(0, 10000); 

      const prompt = `Please provide a professional summary of the following knowledge base content. 
      This summary will be shown to the user so they know what information the AI sales agent is trained on.
      Format it in Indonesian language, professional tone, with bullet points for key topics.
      Include a section for "Key Products/Services", "Main Benefits", and "Target Audience" if applicable based on the text.
      
      TEXT CONTENT TO SUMMARIZE:
      ${combinedText}`;

      const endpoint = provider.endpoint || 'https://api.openai.com/v1/chat/completions';
      const limits = await this.getModelLimits(provider.model);
      const payload = {
        model: provider.model,
        messages: [
          { 
            role: 'system', 
            content: 'You are an AI assistant that summarizes business knowledge bases for a CRM Sales Expert AI.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: limits.maxOutput,
        temperature: 0.5
      };

      const response = await axios.post(endpoint, payload, {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      let summary = response.data.choices[0].message.content.trim();
      
      // Remove <think>...</think> blocks often returned by reasoning models (like DeepSeek)
      summary = summary.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      
      // Save it to the user
      const { User } = require('../models');
      await User.update({ knowledgeSummary: summary }, { where: { id: userId } });

      await this.incrementUsage(provider);
      
      return summary;
    } catch (error) {
      console.error('[AIService] Summary Generation Error:', error.response?.data || error.message);
      return null;
    }
  }
  /**
   * Determine max output tokens based on model name
   * useful for avoiding truncation or API errors on different providers
   */
  /**
   * Determine max output tokens based on model name
   * useful for avoiding truncation or API errors on different providers
   */
  async getModelLimits(modelName) {
    if (!modelName) return { maxOutput: 2000 };
    
    try {
      // 1. Try DB Lookup
      const spec = await AiModelSpec.findOne({ 
        where: { model: modelName },
        attributes: ['maxOutput'] 
      });
      
      if (spec) return { maxOutput: spec.maxOutput };
    } catch (dbErr) {
      console.warn('[AIService] DB Spec lookup failed, using fallback:', dbErr.message);
    }
    
    const lower = modelName.toLowerCase();
    
    // Fallbacks
    // Local / Light Models
    if (lower.includes('qwen2.5')) return { maxOutput: 4096 }; // Qwen 2.5 supports up to 32k context
    if (lower.includes('llama-3.2')) return { maxOutput: 4096 };
    if (lower.includes('smollm')) return { maxOutput: 2048 };
    
    // Groq Models
    if (lower.includes('llama-3.3-70b')) return { maxOutput: 32768 }; // Versatile
    if (lower.includes('llama-3.1-70b')) return { maxOutput: 32768 }; // Versatile
    if (lower.includes('llama-3.1-8b')) return { maxOutput: 8192 };   // Instant
    if (lower.includes('mixtral-8x7b')) return { maxOutput: 32768 };
    if (lower.includes('gemma2-9b')) return { maxOutput: 8192 };
    
    // OpenAI Models
    if (lower.includes('gpt-4-turbo') || lower.includes('gpt-4o')) return { maxOutput: 4096 };
    if (lower.includes('gpt-4')) return { maxOutput: 4096 }; // older gpt-4
    if (lower.includes('gpt-3.5')) return { maxOutput: 4096 };
    
    return { maxOutput: 2000 }; // Safe conservative default
  }
}

module.exports = new AIService();
