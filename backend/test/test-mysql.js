const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function testMySQLConnection() {
  console.log('🧪 Testing MySQL Connection...\n');
  console.log('Configuration:');
  console.log(`  Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`  Port: ${process.env.DB_PORT || 3306}`);
  console.log(`  Database: ${process.env.DB_NAME || 'crm_marketing'}`);
  console.log(`  User: ${process.env.DB_USER || 'root'}`);
  console.log('');

  try {
    // Test connection without database first
    console.log('📡 Attempting to connect to MySQL server...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('✅ Connected to MySQL server successfully!\n');

    // Check if database exists
    const dbName = process.env.DB_NAME || 'crm_marketing';
    console.log(`🔍 Checking if database '${dbName}' exists...`);
    
    const [databases] = await connection.query('SHOW DATABASES');
    const dbExists = databases.some(db => db.Database === dbName);

    if (dbExists) {
      console.log(`✅ Database '${dbName}' exists\n`);
      
      // Connect to the database
      await connection.changeUser({ database: dbName });
      
      // Show tables
      const [tables] = await connection.query('SHOW TABLES');
      console.log(`📊 Tables in '${dbName}':`);
      if (tables.length === 0) {
        console.log('  (No tables yet - database is empty)');
      } else {
        tables.forEach(table => {
          const tableName = Object.values(table)[0];
          console.log(`  - ${tableName}`);
        });
      }
    } else {
      console.log(`⚠️  Database '${dbName}' does not exist`);
      console.log(`\n💡 To create the database, run:`);
      console.log(`   CREATE DATABASE ${dbName};`);
    }

    await connection.end();
    console.log('\n✅ MySQL connection test completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ MySQL connection test failed!');
    console.error('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('  1. Make sure MySQL is running');
      console.error('  2. Check if the host and port are correct');
      console.error('  3. Verify firewall settings');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Troubleshooting:');
      console.error('  1. Check your username and password');
      console.error('  2. Verify user permissions in MySQL');
    }
    
    process.exit(1);
  }
}

testMySQLConnection();
