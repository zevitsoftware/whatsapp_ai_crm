'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    return queryInterface.bulkInsert('users', [{
      id: uuidv4(),
      name: 'System Admin',
      email: 'admin@marketing.com',
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      companyName: 'Marketing Engine Corp',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('users', { email: 'admin@marketing.com' }, {});
  }
};
