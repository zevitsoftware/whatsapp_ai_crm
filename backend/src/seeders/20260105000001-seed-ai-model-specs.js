'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const specs = [
      {
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        maxContext: 128000,
        maxOutput: 8192,
        rpm: 30,
        rpd: 14400,
        tpm: 6000,
        tpd: 500000
      },
      {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        maxContext: 128000,
        maxOutput: 32768,
        rpm: 30,
        rpd: 1000,
        tpm: 12000,
        tpd: 100000
      },
      {
        provider: 'groq',
        model: 'mixtral-8x7b-32768',
        maxContext: 32768,
        maxOutput: 32768,
        rpm: 30,
        rpd: 5000, // Estimate / General default
        tpm: 10000,
        tpd: 200000
      },
      {
        provider: 'groq',
        model: 'gemma2-9b-it',
        maxContext: 8192,
        maxOutput: 8192,
        rpm: 30,
        rpd: 14400,
        tpm: 15000, 
        tpd: 500000
      },
      {
        provider: 'openai',
        model: 'gpt-4o',
        maxContext: 128000,
        maxOutput: 4096,
        rpm: 500,
        rpd: 10000,
        tpm: 300000, 
        tpd: 10000000
      },
      {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        maxContext: 16384,
        maxOutput: 4096,
        rpm: 3500,
        rpd: 100000,
        tpm: 1000000, 
        tpd: 100000000
      }
    ];

    const records = specs.map(spec => ({
      id: uuidv4(),
      ...spec,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Upsert to avoid duplicates if re-run (though bulkInsert doesn't upsert, so we check existence or just insert)
    // For simplicity in seeder with UUIDs, we just insert. If it fails due to unique constraint, so be it.
    // Ideally we check if exists.
    
    // We will use ignoreDuplicates for bulkInsert if supported, or just insert.
    return queryInterface.bulkInsert('ai_model_specs', records, { ignoreDuplicates: true });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('ai_model_specs', null, {});
  }
};
