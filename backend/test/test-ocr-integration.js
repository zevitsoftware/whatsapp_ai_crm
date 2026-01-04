const ocrService = require('./src/services/ocr.service');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

async function testOCRIntegration() {
  console.log('🧪 Testing OCR Service Integration...\n');
  console.log('Configuration:');
  console.log(`  OCR Service URL: ${process.env.OCR_SERVICE_URL || 'http://localhost:5000'}`);
  console.log(`  Shared Media Path: ${process.env.SHARED_MEDIA_PATH || '../shared_media'}`);
  console.log('');

  try {
    // Test 1: Health Check
    console.log('📡 Test 1: OCR Service Health Check');
    const isHealthy = await ocrService.healthCheck();
    
    if (isHealthy) {
      console.log('✅ OCR service is healthy\n');
    } else {
      console.log('❌ OCR service is not healthy\n');
      throw new Error('OCR service health check failed');
    }

    // Test 2: Check if there are any files in shared_media
    console.log('📁 Test 2: Checking shared_media directory');
    const fs = require('fs');
    const sharedMediaPath = process.env.SHARED_MEDIA_PATH || path.join(__dirname, '../shared_media');
    
    if (!fs.existsSync(sharedMediaPath)) {
      console.log(`⚠️  Shared media directory does not exist: ${sharedMediaPath}`);
      console.log('   Creating directory...');
      fs.mkdirSync(sharedMediaPath, { recursive: true });
      console.log('✅ Directory created\n');
    } else {
      console.log(`✅ Shared media directory exists: ${sharedMediaPath}`);
      
      const files = fs.readdirSync(sharedMediaPath);
      console.log(`   Files in directory: ${files.length}`);
      
      if (files.length > 0) {
        console.log('   Files:');
        files.forEach(file => console.log(`     - ${file}`));
      }
      console.log('');
    }

    // Test 3: Test file scanning (if files exist)
    const testFiles = fs.readdirSync(sharedMediaPath).filter(f => 
      f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.pdf')
    );

    if (testFiles.length > 0) {
      console.log('📸 Test 3: Scanning a test file');
      const testFile = testFiles[0];
      console.log(`   Testing with: ${testFile}`);
      
      try {
        const result = await ocrService.scanSharedFile(testFile);
        console.log('✅ Scan successful!');
        console.log(`   Text found: ${result.text ? 'Yes' : 'No'}`);
        console.log(`   Text blocks: ${result.results?.length || 0}`);
        
        if (result.text) {
          const preview = result.text.substring(0, 100);
          console.log(`   Preview: ${preview}${result.text.length > 100 ? '...' : ''}`);
        }
        console.log('');
      } catch (error) {
        console.error('❌ Scan failed:', error.message);
        console.log('');
      }
    } else {
      console.log('ℹ️  Test 3: Skipped (no image/PDF files in shared_media)');
      console.log('   To test OCR, add an image or PDF to the shared_media directory\n');
    }

    console.log('✅ OCR Integration Test Completed!\n');
    console.log('💡 Next Steps:');
    console.log('   1. Upload a file via API: POST /api/ocr/upload');
    console.log('   2. Test webhook: POST /webhooks/waha');
    console.log('   3. Check OCR health: GET /api/ocr/health');
    
    process.exit(0);

  } catch (error) {
    console.error('\n❌ OCR Integration Test Failed!');
    console.error('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('  1. Make sure the OCR service is running');
      console.error('  2. Check docker-compose: docker-compose ps');
      console.error('  3. Start OCR service: docker-compose up -d ocr');
      console.error('  4. Check OCR logs: docker logs crm-ocr');
    }
    
    process.exit(1);
  }
}

testOCRIntegration();
