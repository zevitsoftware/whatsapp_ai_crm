const { AiProvider, sequelize } = require('../models');
const axios = require('axios');
const { Op } = require('sequelize');
const vectorService = require('./vector.service');

class AIService {
  /**
   * Main method to generate AI response with RAG
   * @param {string} userId - User ID for context filtering
   * @param {string} text - User's message/question
   * @param {boolean} useKnowledgeBase - Whether to use RAG (default: true)
   */
  async generateResponse(userId, text, useKnowledgeBase = true, history = []) {
    try {
      // 1. Find best available provider
      const provider = await this.getAvailableProvider();
      
      if (!provider) {
        console.warn('[AIService] No AI providers available or limits reached');
        return null;
      }

      // 2. Retrieve relevant context from knowledge base (RAG)
      let context = '';
      if (useKnowledgeBase) {
        const relevantChunks = await vectorService.searchSimilar({
          userId,
          query: text,
          topK: 8 // Get top 8 most relevant chunks for better multi-file context
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

      // 3. Call AI API with history and context
      const response = await this.callAI(provider, text, context, history);
      
      if (response) {
        await this.incrementUsage(provider);
        return response;
      }

      return null;
    } catch (error) {
      console.error('[AIService] AI Generation Error:', error.message);
      return null;
    }
  }

  /**
   * Get active provider with highest priority and remaining quota
   * Implements random rotation among available providers for load balancing
   */
  async getAvailableProvider() {
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch all active providers
    let providers = await AiProvider.findAll({
      where: { isActive: true },
      order: [['priority', 'DESC']]
    });

    if (providers.length === 0) return null;

    // 2. Handle resets and filter by quota
    const eligibleProviders = [];
    for (const p of providers) {
      // Check if daily reset needed
      if (p.lastDailyReset !== today) {
        p.dailyUsed = 0;
        p.lastDailyReset = today;
        await p.save();
      }

      // Check limits
      if (p.dailyUsed < p.dailyLimit && p.monthlyUsed < p.monthlyLimit) {
        eligibleProviders.push(p);
      }
    }

    if (eligibleProviders.length === 0) return null;

    // 3. Random Rotation: Filter for highest available priority
    const maxPriority = Math.max(...eligibleProviders.map(p => p.priority));
    const topTierProviders = eligibleProviders.filter(p => p.priority === maxPriority);
    const selected = topTierProviders[Math.floor(Math.random() * topTierProviders.length)];

    console.log(`[AIService] Load Balancing: Selected ${selected.name} (Priority: ${selected.priority})`);
    return selected;
  }

  /**
   * Call the AI API (supports any OpenAI-compatible provider)
   */
  async callAI(provider, prompt, context = '', history = []) { 
    try {
      const endpoint = provider.endpoint || 'https://api.openai.com/v1/chat/completions';
      
      const systemPrompt = `Anda adalah pakar penjualan (Sales Expert) berpengalaman 10 tahun yang sangat formal, sopan, dan persuasif.

Pedoman Ketat:
1. SALAM/SAPAAAN: Jika pesan hanyalah sapaan (seperti: Halo, Hi, Selamat Pagi/Siang/Sore), balaslah dengan sapaan formal dan tawarkan bantuan. Contoh: "Halo! Selamat datang di layanan kami. Ada yang bisa kami bantu mengenai layanan kami hari ini?"
2. JAWABLAH HANYA menggunakan informasi yang ada dalam BASIS PENGETAHUAN di bawah.
3. JANGAN gunakan pengetahuan internal Anda sendiri untuk menjawab pertanyaan produk.
4. SEMUA jawaban harus dalam Bahasa Indonesia yang formal (Baku).
5. HARGA: Jika ditanya tentang harga, berikan informasi harga atau "Rentang Harga" yang tersedia di basis pengetahuan (misalnya: Rp 8.000 - 225.000). Jangan katakan tidak tahu jika ada informasi tersebut.
6. PENTING: Jika BASIS PENGETAHUAN benar-benar tidak membantu menjawab pertanyaan, barulah minta maaf secara sopan dan arahkan ke topik yang tersedia (komposisi, manfaat, kemasan, dll).
7. Gunakan gaya bahasa sales yang persuasif namun tetap sopan dan formal.

${context ? '--- BASIS PENGETAHUAN ---\n' + context + '\n--- AKHIR BASIS PENGETAHUAN ---' : '--- BASIS PENGETAHUAN ---\n(Kosong)\n--- AKHIR BASIS PENGETAHUAN ---'}`;

      // Build Messages Array with History
      // We filter out the last user message if it's already in the prompt to prevent duplication
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(msg => ({ 
          role: msg.role === 'assistant' ? 'assistant' : 'user', 
          content: msg.content 
        })).filter(msg => msg.content !== prompt) // Avoid duplicate of current prompt if history is inclusive
      ];

      // Add current user prompt
      messages.push({ role: 'user', content: prompt });

      const payload = {
        model: provider.model,
        messages: messages,
        max_tokens: 300,
        temperature: 0.7
      };

      const response = await axios.post(endpoint, payload, {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      return response.data.choices[0].message.content.trim();

    } catch (error) {
      console.error(`[AIService] API Call failed for ${provider.name}:`, error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Increment usage counters
   */
  async incrementUsage(provider) {
    provider.dailyUsed += 1;
    provider.monthlyUsed += 1;
    await provider.save();
  }
}

module.exports = new AIService();
