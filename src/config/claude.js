const axios = require('axios');

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Parse Claude response
function parseClaudeResponse(content) {
  try {
    if (!content || typeof content !== 'string') {
      throw new Error('Response is not a string');
    }

    console.log('📄 Parsing response...');
    console.log(`   Length: ${content.length} chars`);

    // Remove markdown code blocks
    let cleanContent = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    console.log(`   Cleaned: ${cleanContent.length} chars`);

    // Try direct parse first
    try {
      const result = JSON.parse(cleanContent);
      console.log('✅ JSON parsed successfully');
      return result;
    } catch (parseError) {
      console.log('⚠️ Direct parse failed, extracting...');

      // Extract JSON object
      const match = cleanContent.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error('No JSON object found');
      }

      let jsonStr = match[0];  // ✅ FIX: Get first array element

      // Repair if truncated
      const openBraces = (jsonStr.match(/\{/g) || []).length;
      const closeBraces = (jsonStr.match(/\}/g) || []).length;
      if (openBraces > closeBraces) {
        jsonStr += '\n}'.repeat(openBraces - closeBraces);
      }

      const result = JSON.parse(jsonStr);
      console.log('✅ Extracted JSON parsed');
      return result;
    }
  } catch (error) {
    console.error('❌ Parse error:', error.message);
    throw error;
  }
}




// Analyze bank statement
async function analyzeRawData(rawData) {
  try {
    // Validate
    if (!CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY not set');
    }

    if (!rawData || typeof rawData !== 'string' || rawData.trim().length === 0) {
      throw new Error('Invalid input data');
    }

    // Take 20%
    const totalLength = rawData.length;
    const twentyPercent = Math.floor(totalLength * 0.2);
    const sampleData = rawData.substring(0, twentyPercent).trim();

    console.log(`📊 File: ${totalLength} bytes`);
    console.log(`📊 Sample: ${sampleData.length} bytes (20%)`);

    // Prompt
    const prompt = `Extract up to 50 transactions from this bank statement.

DATA:
${sampleData}

Return ONLY this JSON - NO explanations:

{
  "isFinancialData": true,
  "account": {
    "accountNumber": "GR1234567890",
    "accountName": "Account",
    "currency": "EUR"
  },
  "transactions": [
    {
      "id": "txn_001",
      "date": "2025-11-08",
      "description": "Transaction",
      "amount": 1000,
      "type": "CREDIT",
      "categoryCode": "INVOICE_PAYMENT_FULL",
      "confidence": 0.9
    }
  ],
  "summary": {
    "totalTransactions": 1,
    "creditTotal": 1000,
    "debitTotal": 0,
    "netCashFlow": 1000
  }
}`;

    console.log('📨 Calling Claude...');

    // Call Claude
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: CLAUDE_MODEL,
        max_tokens: 8000,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        timeout: 60000
      }
    );

    console.log('✅ Got response from Claude');

    // FIXED: Check response structure correctly
    if (!response || !response.data) {
      throw new Error('No response data');
    }

    if (!response.data.content || !Array.isArray(response.data.content)) {
      throw new Error('Invalid content structure');
    }

    if (response.data.content.length === 0) {
      throw new Error('Empty content array');
    }

    if (!response.data.content[0] || !response.data.content[0].text) {
      throw new Error('No text in content');
    }
    
    const content = response.data.content[0].text;
    
    console.log(`✅ Received text: ${content.length} chars`);
    console.log(`   First 100: ${content.substring(0, 100)}`);

    // Parse
    const result = parseClaudeResponse(content);

    // Validate
    if (!result.isFinancialData) {
      console.log('⚠️ Not financial data');
      return result;
    }

    if (!Array.isArray(result.transactions)) {
      throw new Error('Transactions not array');
    }

    console.log(`✅ Success: ${result.transactions.length} transactions`);
    return result;

  } catch (error) {
    console.error('❌ Claude error:', error.message);

    if (error.response && error.response.data) {
      console.error('API error:', error.response.data);
    }

    throw new Error(`Claude failed: ${error.message}`);
  }
}

module.exports = {
  analyzeRawData
};
