'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ai_model_specs', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      provider: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'e.g., groq, openai, anthropic'
      },
      model: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'The exact model string identifier'
      },
      maxContext: {
        type: Sequelize.INTEGER,
        defaultValue: 8192,
        comment: 'Total context window size'
      },
      maxOutput: {
        type: Sequelize.INTEGER,
        defaultValue: 2000,
        comment: 'Max tokens for completion output'
      },
      rpm: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Requests Per Minute limit'
      },
      rpd: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Requests Per Day limit'
      },
      tpm: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Tokens Per Minute limit'
      },
      tpd: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Tokens Per Day limit'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add index for fast lookups
    await queryInterface.addIndex('ai_model_specs', ['model']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ai_model_specs');
  }
};
