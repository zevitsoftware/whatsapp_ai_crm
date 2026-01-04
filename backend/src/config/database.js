const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crm_marketing',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

async function initDatabase() {
  try {
    const { database, ...configWithoutDb } = dbConfig;
    
    // 1. Connect without database first to ensure we can reach the server
    console.log(`📡 Connecting to MySQL at ${dbConfig.host}:${dbConfig.port}...`);
    const tempConnection = await mysql.createConnection(configWithoutDb);
    
    // 2. Create database if it doesn't exist
    console.log(`🔍 Ensuring database '${database}' exists...`);
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await tempConnection.end();

    // 3. Initialize the actual pool with the database
    pool = mysql.createPool(dbConfig);
    
    // 4. Test connection from pool
    const connection = await pool.getConnection();
    console.log('✅ MySQL connected successfully');
    console.log(`📊 Database: ${database}`);
    console.log(`🔗 Host: ${dbConfig.host}:${dbConfig.port}`);
    
    connection.release();
    return pool;
  } catch (error) {
    console.error('❌ MySQL initialization failed:', error.message);
    throw error;
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDatabase() first.');
  }
  return pool;
}

async function query(sql, params) {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results;
  } finally {
    connection.release();
  }
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    console.log('🔌 MySQL connection closed');
  }
}

module.exports = {
  initDatabase,
  getPool,
  query,
  closeDatabase
};
