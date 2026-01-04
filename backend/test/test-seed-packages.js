const { SubscriptionPackage } = require('./src/models');

async function seed() {
  try {
    const packages = [
      {
        name: 'Free Trial',
        type: 'FREE',
        price: 0,
        durationDays: 7,
        features: { broadcastLimit: 100, deviceLimit: 1 }
      },
      {
        name: 'Pro Monthly',
        type: 'PRO',
        price: 150000,
        durationDays: 30,
        features: { broadcastLimit: 5000, deviceLimit: 5 }
      },
      {
        name: 'Enterprise',
        type: 'ENTERPRISE',
        price: 500000,
        durationDays: 30,
        features: { broadcastLimit: -1, deviceLimit: 20 }
      }
    ];

    for (const pkg of packages) {
      const [item, created] = await SubscriptionPackage.findOrCreate({
        where: { type: pkg.type },
        defaults: pkg
      });
      if (created) {
        console.log(`✅ Created package: ${pkg.name}`);
      } else {
        await item.update(pkg);
        console.log(`🔄 Updated package: ${pkg.name}`);
      }
    }

    console.log('✨ Seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
