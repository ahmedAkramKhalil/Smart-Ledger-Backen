const axios = require('axios');

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_MODEL = 'claude-sonnet-4-20250514'; // Updated to latest model
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

const categories = {
  credit: [
    { code: 'INVOICE_PAYMENT_FULL', name: 'Invoice Payment (Full)' },
    { code: 'INVOICE_PAYMENT_PARTIAL', name: 'Invoice Payment (Partial)' },
    { code: 'CAPITAL_RAISE', name: 'Capital Raise' },
    { code: 'INTEREST_INCOME', name: 'Interest Income' },
    { code: 'EXPENSE_REFUND', name: 'Expense Refund' },
    { code: 'LOAN_RECEIVED', name: 'Loan Received' },
    { code: 'INTERCOMPANY_IN', name: 'Intercompany Transfer In' },
    { code: 'ATM_DEPOSIT', name: 'ATM Deposit' },
    { code: 'UNCATEGORIZED_IN', name: 'Uncategorized Income' }
  ],
  debit: [
    { code: 'SUPPLIER_PAYMENT', name: 'Supplier Payment' },
    { code: 'LOAN_REPAYMENT', name: 'Loan Repayment' },
    { code: 'BANK_FEES', name: 'Bank Fees' },
    { code: 'TAX_PAYMENT', name: 'Tax Payment' },
    { code: 'PAYROLL', name: 'Payroll' },
    { code: 'RENT', name: 'Rent Payment' },
    { code: 'UTILITIES', name: 'Utilities' },
    { code: 'ADMIN_EXPENSES', name: 'Admin Expenses' },
    { code: 'ATM_WITHDRAWAL', name: 'ATM Withdrawal' }
  ]
};

// Helper function to parse Claude responses
function parseClaudeResponse(content) {
  try {
    // Remove markdown code blocks if present
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try direct parse first
    try {
      return JSON.parse(cleanContent);
    } catch (e) {
      // Fallback: extract JSON from text
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch);
    }
  } catch (error) {
    console.error('Failed to parse Claude response:', content);
    throw new Error('Claude returned invalid JSON format');
  }
}

// Analyze raw data with Claude AI
async function analyzeRawData(rawData) {
  if (!CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY not configured in .env');
  }

  // Validate data
  if (!rawData || rawData.trim().length === 0) {
    throw new Error('No data to analyze');
  }

  // Limit data size to prevent token issues
  let dataToSend = rawData;
  const dataSize = Buffer.byteLength(rawData, 'utf8');
  
  if (dataSize > 50000) {
    console.warn(`⚠️ Data size ${dataSize} bytes - truncating to first 50KB`);
    dataToSend = rawData.substring(0, 50000);
  }

  const prompt = `You are a financial data analyst. Analyze the provided data and:

1. FIRST: Determine if this is financial/transaction data
2. IF YES: Extract and structure all transactions
3. CATEGORIZE each transaction into one of these categories:

CREDIT TRANSACTIONS (Money In):
${categories.credit.map(c => `- ${c.code}: ${c.name}`).join('\n')}

DEBIT TRANSACTIONS (Money Out):
${categories.debit.map(c => `- ${c.code}: ${c.name}`).join('\n')}

4. For each transaction, provide:
   - date (YYYY-MM-DD format)
   - description
   - amount (absolute number, no currency symbol)
   - type (CREDIT or DEBIT)
   - categoryCode (exact match from above)
   - confidence (0.0 to 1.0)
   - reasoning

RAW DATA:
${dataToSend}

IMPORTANT: Return ONLY valid JSON, nothing else. No markdown, no code blocks.

{
  "isFinancialData": true/false,
  "analysis": "Brief summary",
  "transactions": [
    {
      "id": "txn_001",
      "date": "2025-11-08",
      "description": "Description",
      "amount": 2500,
      "type": "CREDIT",
      "categoryCode": "INVOICE_PAYMENT_FULL",
      "confidence": 0.95,
      "reasoning": "Why"
    }
  ],
  "summary": {
    "totalTransactions": 0,
    "creditTotal": 0,
    "debitTotal": 0,
    "netCashFlow": 0
  }
}`;

  try {
    console.log('🤖 Calling Claude API...');
    console.log(`📊 Data size: ${dataSize} bytes`);

    const response = await axios.post(CLAUDE_API_URL, {
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }, {
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    console.log('✅ Claude API response received');
    console.log(`📝 Response status: ${response.status}`);

    const content = response.data.content[0].text;
    console.log(`📄 Response length: ${content.length} characters`);

    const analysisResult = parseClaudeResponse(content);

    console.log('✅ Claude AI Analysis Complete');
    console.log(`📊 Found ${analysisResult.transactions?.length || 0} transactions`);
    
    return analysisResult;

  } catch (error) {
    console.error('❌ Claude API Error Details:');
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    console.error('   Message:', error.message);

    // Better error messages
    if (error.response?.status === 400) {
      console.error('   ⚠️ 400 Bad Request - Check API key and prompt format');
      throw new Error(`Claude API returned 400: Invalid request. Check API key format.`);
    }

    if (error.response?.status === 401) {
      throw new Error(`Claude API authentication failed: Invalid API key`);
    }

    if (error.response?.status === 429) {
      throw new Error(`Claude API rate limited: Too many requests. Try again later.`);
    }

    throw new Error(`Claude AI analysis failed: ${error.message}`);
  }
}



// Categorize transactions
async function categorizeTransactions(transactions) {
  if (!CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY not configured in .env');
  }

  const prompt = `You are a financial expert analyzing Greek business bank transactions.

Analyze each transaction and categorize it into ONE of the following categories:

CREDIT TRANSACTIONS (Money In):
${categories.credit.map(c => `- ${c.code}: ${c.name}`).join('\n')}

DEBIT TRANSACTIONS (Money Out):
${categories.debit.map(c => `- ${c.code}: ${c.name}`).join('\n')}

For each transaction, provide:
1. Category code (exact match from above)
2. Confidence score (0.0 to 1.0)
3. Brief reasoning

Transaction data to categorize:
${JSON.stringify(transactions, null, 2)}

Respond ONLY with valid JSON in this format, no other text:
[
  {
    "id": "transaction_id",
    "categoryCode": "CATEGORY_CODE",
    "confidence": 0.95,
    "reasoning": "Brief explanation"
  }
]`;

  try {
    const response = await axios.post(CLAUDE_API_URL, {
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }, {
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    const content = response.data.content.text; // FIXED: Access array element
    const categorizations = parseClaudeResponse(content);
    
    return categorizations;
  } catch (error) {
    console.error('Claude API Error:', error.response?.data || error.message);
    throw new Error(`Failed to categorize transactions: ${error.message}`);
  }
}

module.exports = {
  analyzeRawData,
  categorizeTransactions,
  categories,
  CLAUDE_MODEL
};
