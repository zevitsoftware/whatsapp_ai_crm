'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // 1. Define Specs (Limits) for new Free/High-Value Models
    // UUIDs generated deterministically or just random (random is fine for seeders usually, but upsert needs unique keys)
    const specs = [
      // --- Google Generic Specs ---
      {
        provider: 'google',
        model: 'gemini-1.5-flash',
        maxContext: 1048576,
        maxOutput: 8192,
        rpm: 15,
        rpd: 1500, // Free tier limit
        tpm: 1000000,
        tpd: null
      },
      {
        provider: 'google',
        model: 'gemini-1.5-pro',
        maxContext: 2097152,
        maxOutput: 8192,
        rpm: 2,
        rpd: 50,
        tpm: 32000,
        tpd: null
      },
      {
        provider: 'google',
        model: 'gemini-2.0-flash-exp',
        maxContext: 1048576,
        maxOutput: 8192,
        rpm: 10,
        rpd: 1500,
        tpm: null,
        tpd: null
      },
      // --- OpenRouter Free Tier Specs ---
      {
        provider: 'openrouter',
        model: 'google/gemini-2.0-flash-exp:free',
        maxContext: 1000000,
        maxOutput: 8192,
        rpm: 20,
        rpd: 50, // Conservative default for <$10 credit users
        tpm: null,
        tpd: null
      },
      {
        provider: 'openrouter',
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        maxContext: 128000,
        maxOutput: 4096,
        rpm: 20,
        rpd: 50,
        tpm: null,
        tpd: null
      },
      {
        provider: 'openrouter',
        model: 'meta-llama/llama-3.2-3b-instruct:free',
        maxContext: 128000,
        maxOutput: 4096,
        rpm: 20,
        rpd: 50,
        tpm: null,
        tpd: null
      }
    ];

    const specRecords = specs.map(s => ({
      id: uuidv4(),
      ...s,
      createdAt: now,
      updatedAt: now
    }));

    // Insert Specs (Ignore specific ID conflicts, but model is unique Key usually)
    // We use bulkInsert with ignoreDuplicates/update depending on dialect, 
    // but here we just try to insert new models.
    for (const spec of specRecords) {
      const exists = await queryInterface.rawSelect('ai_model_specs', {
        where: { model: spec.model },
      }, ['id']);
      if (!exists) {
        await queryInterface.bulkInsert('ai_model_specs', [spec]);
      }
    }

    // 2. Insert Providers (Drafts waiting for Keys)
    const providers = [
      {
        name: 'Google Gemini Flash (Free)',
        apiKey: 'INSERT_GOOGLE_AI_KEY_HERE',
        model: 'gemini-1.5-flash',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        dailyLimit: 1500,
        monthlyLimit: 40000, 
        isActive: true, // Active by default, but user must update key
        priority: 2 // Higher than Groq default?
      },
      {
        name: 'Google Gemini Pro (Free)',
        apiKey: 'INSERT_GOOGLE_AI_KEY_HERE',
        model: 'gemini-1.5-pro',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        dailyLimit: 50,
        monthlyLimit: 1500,
        isActive: true,
        priority: 3 // High priority for complex tasks if we had logic for that
      },
      {
        name: 'OpenRouter Free (Gemini Flash Exp)',
        apiKey: 'INSERT_OPENROUTER_KEY_HERE',
        model: 'google/gemini-2.0-flash-exp:free',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        dailyLimit: 50,
        monthlyLimit: 1500,
        isActive: true,
        priority: 1
      },
      {
        name: 'OpenRouter Free (Llama 3.3)',
        apiKey: 'INSERT_OPENROUTER_KEY_HERE',
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        dailyLimit: 50,
        monthlyLimit: 1500,
        isActive: true,
        priority: 1
      }
    ];

    const providerRecords = providers.map(p => ({
      id: uuidv4(),
      ...p,
      dailyUsed: 0,
      monthlyUsed: 0,
      createdAt: now,
      updatedAt: now
    }));

    await queryInterface.bulkInsert('ai_providers', providerRecords, {});
  },

  async down(queryInterface, Sequelize) {
    // Delete providers with placeholder keys
    const { Op } = Sequelize;
    await queryInterface.bulkDelete('ai_providers', {
        apiKey: { [Op.like]: 'INSERT_%' }
    });
    // We refrain from deleting specs in case they are used by others now
  }
};
