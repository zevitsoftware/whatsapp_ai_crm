const db = require('./src/models');

async function sync() {
  try {
    console.log('🔄 Syncing database models...');
    await db.sequelize.sync({ alter: true });
    console.log('✅ Database synced successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    process.exit(1);
  }
}

sync();
