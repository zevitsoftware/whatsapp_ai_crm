require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'crm_admin',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'crm_marketing',
    host: process.env.DB_HOST || 'host.docker.internal',
    dialect: 'mysql',
    logging: false,
    port: process.env.DB_PORT || 3306,
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'crm_marketing_test',
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};
