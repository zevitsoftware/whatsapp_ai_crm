const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class OCRService {
  constructor() {
    this.baseURL = process.env.OCR_SERVICE_URL || 'http://localhost:5000';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 120000, // 120 seconds timeout for OCR processing
    });
  }

  /**
   * Scan a file using PaddleOCR
   * @param {string} filePath - Absolute path to the file (should be in shared_media)
   * @returns {Promise<Object>} OCR result with extracted text
   */
  async scanFile(filePath) {
    try {
      console.log(`📸 OCR: Scanning file: ${filePath}`);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));

      // Send request to OCR service
      const response = await this.client.post('/upload', formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      console.log(`✅ OCR: Scan completed. Found ${response.data.results?.length || 0} text blocks`);

      return {
        success: true,
        text: response.data.text || '',
        results: response.data.results || [],
        filename: path.basename(filePath),
      };

    } catch (error) {
      console.error('❌ OCR: Scan failed:', error.message);
      
      if (error.response) {
        throw new Error(`OCR service error: ${error.response.data?.error || error.response.statusText}`);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('OCR service is not available. Make sure the OCR container is running.');
      } else {
        throw error;
      }
    }
  }

  /**
   * Scan a file from shared_media directory using the /scan endpoint
   * @param {string} filename - Filename in shared_media directory
   * @returns {Promise<Object>} OCR result with extracted text
   */
  async scanSharedFile(filename) {
    try {
      console.log(`📸 OCR: Scanning shared file: ${filename}`);

      // The OCR service expects a full absolute path inside its container
      const filePath = `/app/shared_media/${filename}`;

      const response = await this.client.post('/scan', {
        filePath: filePath,
      });

      console.log(`✅ OCR: Scan completed. Found text length: ${response.data.text?.length || 0}`);

      return {
        success: true,
        text: response.data.text || '',
        results: response.data.results || [],
        filename: filename,
      };

    } catch (error) {
      console.error('❌ OCR: Scan failed:', error.message);
      
      if (error.response) {
        throw new Error(`OCR service error: ${error.response.data?.detail || error.response.data?.error || error.response.statusText}`);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('OCR service is not available. Make sure the OCR container is running.');
      } else {
        throw error;
      }
    }
  }

  /**
   * Check if OCR service is healthy
   * @returns {Promise<boolean>} True if service is healthy
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/');
      return response.status === 200 && response.data.message?.includes('running');
    } catch (error) {
      console.error('❌ OCR health check failed:', error.message);
      return false;
    }
  }

  /**
   * Extract text from image/PDF and return only the text string
   * @param {string} filePath - Path to file
   * @returns {Promise<string>} Extracted text
   */
  async extractText(filePath) {
    const result = await this.scanFile(filePath);
    return result.text;
  }

  /**
   * Extract text from shared file and return only the text string
   * @param {string} filename - Filename in shared_media
   * @returns {Promise<string>} Extracted text
   */
  async extractTextFromShared(filename) {
    const result = await this.scanSharedFile(filename);
    return result.text;
  }
}

// Export singleton instance
module.exports = new OCRService();
