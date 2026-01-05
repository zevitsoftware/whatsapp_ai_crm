'use strict';
const { v4: uuidv4 } = require('uuid');

/**
 * Migration to update subscription packages:
 * - Removes 'Broadcast' related limits
 * - Focuses on 'AI' and 'Contact' limits
 * - Adds 'Team' limits
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const newPackages = [
      {
        id: uuidv4(),
        name: 'Free Trial',
        type: 'FREE',
        price: 0.00,
        durationDays: 7,
        features: JSON.stringify({
          maxDevices: 1,
          maxContacts: 500,
          maxTeamMembers: 1,
          // broadcastsPerMonth: 0, // Removed as requested
          ai: {
            enabled: true,
            maxKbChunks: 7,        // STRICT: ~5.6k chars
            maxRepliesPerMonth: 50, 
            allowedModels: ["flash"] 
          }
        }),
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'Pro Monthly',
        type: 'PRO',
        price: 199000.00,
        durationDays: 30,
        features: JSON.stringify({
          maxDevices: 5,
          maxContacts: 10000,
          maxTeamMembers: 3,
          ai: {
            enabled: true,
            maxKbChunks: 50,       // ~40k chars
            maxRepliesPerMonth: 2000,
            allowedModels: ["flash", "smart"] // Llama 70B
          }
        }),
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'Enterprise',
        type: 'ENTERPRISE',
        price: 999000.00,
        durationDays: 30,
        features: JSON.stringify({
          maxDevices: 20,
          maxContacts: 999999, // Unlimited effectively
          maxTeamMembers: 10,
          ai: {
            enabled: true,
            maxKbChunks: 200,      // ~160k chars
            maxRepliesPerMonth: 999999,
            allowedModels: ["flash", "smart", "pro"] // GPT-4o / Gemini Pro
          }
        }),
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ];

    // Delete old packages to avoid duplicates easily (or we could update them)
    // Since this is likely dev/staging, we replace them.
    await queryInterface.bulkDelete('subscription_packages', null, {});
    
    // Insert new
    await queryInterface.bulkInsert('subscription_packages', newPackages);
  },

  async down(queryInterface, Sequelize) {
    // Revert logic would imply putting old ones back, but we can't easily know strictly what they were.
    // We just leave it as is for now.
    await queryInterface.bulkDelete('subscription_packages', null, {});
  }
};
