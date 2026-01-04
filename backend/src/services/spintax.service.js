/**
 * Spintax Service
 * Handles text spinning and variable replacement for message personalization
 */

class SpintaxService {
  /**
   * Process spintax syntax: {option1|option2|option3}
   * Example: "Hello {friend|buddy|pal}!" -> "Hello friend!" (random)
   */
  spinText(text) {
    let result = text;
    const regex = /\{([^{}]+)\}/g;
    
    result = result.replace(regex, (match, content) => {
      const options = content.split('|');
      return options[Math.floor(Math.random() * options.length)];
    });
    
    return result;
  }

  /**
   * Replace variables: [name], [phone], etc.
   * Example: "Hi [name]!" with {name: "John"} -> "Hi John!"
   */
  replaceVariables(text, variables = {}) {
    let result = text;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\[${key}\\]`, 'gi');
      result = result.replace(regex, value || '');
    }
    
    return result;
  }

  /**
   * Full message processing: spintax + variables
   */
  processMessage(template, variables = {}) {
    // First apply spintax
    let message = this.spinText(template);
    
    // Then replace variables
    message = this.replaceVariables(message, variables);
    
    return message.trim();
  }

  /**
   * Test spintax pattern validity
   */
  validateSpintax(text) {
    const openBraces = (text.match(/\{/g) || []).length;
    const closeBraces = (text.match(/\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      return { valid: false, error: 'Mismatched braces' };
    }
    
    // Check for nested braces (not supported)
    const regex = /\{[^{}]*\{/;
    if (regex.test(text)) {
      return { valid: false, error: 'Nested braces not supported' };
    }
    
    return { valid: true };
  }
}

module.exports = new SpintaxService();
