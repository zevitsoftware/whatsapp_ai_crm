const { User, Device, AutoReply, AiProvider } = require('./src/models');
const replyService = require('./src/services/reply.service');

async function testReplyFlow() {
  console.log('🤖 Testing Unified Reply Workflow...');

  try {
    // 1. Setup Test Data
    const [user] = await User.findOrCreate({
      where: { email: 'replytest@example.com' },
      defaults: { name: 'Reply Tester', password: 'Password123!' }
    });

    const [device] = await Device.findOrCreate({
      where: { sessionName: 'tasaIphone' },
      defaults: { userId: user.id, status: 'WORKING' }
    });

    // 2. Add an Auto Reply
    await AutoReply.findOrCreate({
      where: { userId: user.id, keyword: 'ping' },
      defaults: {
        matchType: 'EXACT',
        responseText: 'pong! {How are you|Nice to meet you}',
        isActive: true
      }
    });

    console.log('✅ Test data ready');

    // 3. Simulate Incoming Message (Keyword Match)
    console.log('\n💬 Simulating incoming "ping"...');
    await replyService.processIncoming('tasaIphone', {
      from: '1234567890@c.us',
      body: 'ping',
      pushName: 'Tester'
    });

    // 4. Test Regex Match
    await AutoReply.findOrCreate({
      where: { userId: user.id, keyword: 'order #(\\d+)' },
      defaults: {
        matchType: 'REGEX',
        responseText: 'Checking your order status...',
        isActive: true
      }
    });

    console.log('\n💬 Simulating incoming "order #12345"...');
    await replyService.processIncoming('tasaIphone', {
      from: '1234567890@c.us',
      body: 'order #12345',
      pushName: 'Tester'
    });

    console.log('\n🎉 TEST COMPLETED (Check server logs for WAHA calls)');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testReplyFlow();
