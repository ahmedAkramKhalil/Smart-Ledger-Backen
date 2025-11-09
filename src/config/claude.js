const axios = require('axios');

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
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

// Helper function to parse Claude responses with better error recovery
function parseClaudeResponse(content) {
  try {
    console.log('📄 Parsing response...');
    console.log('   Response length:', content.length, 'characters');
    
    // Remove markdown code blocks
    let cleanContent = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    console.log('   Clean content length:', cleanContent.length);

    // Try direct parse first
    try {
      console.log('   Attempting direct JSON parse...');
      const result = JSON.parse(cleanContent);
      console.log('   ✅ Direct parse successful');
      return result;
    } catch (directError) {
      console.log('   ⚠️ Direct parse failed, trying extraction and repair...');
      
      // Extract JSON object or array
      const jsonMatch = cleanContent.match(/\{[\s\S]*$|\[[\s\S]*$/);
      if (!jsonMatch) {
        console.error('   ❌ No JSON structure found');
        throw new Error('No JSON found in response');
      }
      
      let jsonStr = jsonMatch[0];
      
      // Repair truncated JSON
      jsonStr = repairTruncatedJSON(jsonStr);
      
      console.log('   Parsing repaired JSON...');
      const result = JSON.parse(jsonStr);
      console.log('   ✅ Repaired JSON parse successful');
      return result;
    }
    
  } catch (error) {
    console.error('❌ Failed to parse Claude response');
    console.error('   Error:', error.message);
    console.error('   First 500 chars:', content.substring(0, 500));
    console.error('   Last 500 chars:', content.substring(content.length - 500));
    throw new Error(`Claude returned invalid JSON format: ${error.message}`);
  }
}

// Repair truncated JSON by completing structures
function repairTruncatedJSON(jsonStr) {
  console.log('   🔧 Repairing truncated JSON...');
  
  // Remove incomplete last element if in array
  if (jsonStr.includes('"transactions": [')) {
    // Find last complete transaction object
    const lastCompleteMatch = jsonStr.lastIndexOf('    }');
    if (lastCompleteMatch > 0) {
      // Truncate to last complete object
      jsonStr = jsonStr.substring(0, lastCompleteMatch + 5);
      console.log('   Truncated to last complete transaction');
    }
  }
  
  // Count and balance brackets
  const openBraces = (jsonStr.match(/\{/g) || []).length;
  const closeBraces = (jsonStr.match(/\}/g) || []).length;
  const openBrackets = (jsonStr.match(/\[/g) || []).length;
  const closeBrackets = (jsonStr.match(/\]/g) || []).length;
  
  console.log('   Brackets: { open:', openBraces, 'close:', closeBraces, '} [ open:', openBrackets, 'close:', closeBrackets, ']');
  
  // Close arrays first
  if (openBrackets > closeBrackets) {
    jsonStr += '\n  ]'.repeat(openBrackets - closeBrackets);
    console.log('   Added', openBrackets - closeBrackets, 'closing brackets');
  }
  
  // Then close objects
  if (openBraces > closeBraces) {
    jsonStr += '\n}'.repeat(openBraces - closeBraces);
    console.log('   Added', openBraces - closeBraces, 'closing braces');
  }
  
  return jsonStr;
}

// Analyze raw data with Claude AI - Process only 20% of file
async function analyzeRawData(rawData) {
  if (!CLAUDE_API_KEY) throw new Error('CLAUDE_API_KEY missing');
  if (!rawData || rawData.trim().length === 0) throw new Error('No data provided');

  // Take only first 20% of data (max 20KB for faster processing)
  const dataSize = Math.min(Math.floor(rawData.length * 0.2), 20000);
  let cleanData = rawData.substring(0, dataSize);
  
  console.log('📊 Original data size:', rawData.length, 'characters');
  console.log('📊 Analyzing 20% of data:', cleanData.length, 'characters');

  const prompt = `You are an expert financial data extraction AI for Greek business banking systems.

YOUR TASK:
Extract UP TO 50 financial transactions from the provided bank statement data and categorize each one.
IMPORTANT: Keep Greek text unchanged in descriptions.

CATEGORIZATION RULES:

CREDIT CATEGORIES (Money IN - Positive amounts):
- INVOICE_PAYMENT_FULL: Client paid full invoice amount
- INVOICE_PAYMENT_PARTIAL: Client paid partial invoice amount
- CAPITAL_RAISE: Investment, equity funding, capital injection
- INTEREST_INCOME: Bank interest earned
- EXPENSE_REFUND: Refund for previous expense/purchase
- LOAN_RECEIVED: Loan funds received
- INTERCOMPANY_IN: Transfer from related company/branch
- ATM_DEPOSIT: Cash deposit via ATM
- UNCATEGORIZED_IN: Other income not fitting above

DEBIT CATEGORIES (Money OUT - Negative amounts):
- SUPPLIER_PAYMENT: Payment to vendors/suppliers
- LOAN_REPAYMENT: Loan installment or repayment
- BANK_FEES: Bank charges, transaction fees
- TAX_PAYMENT: VAT, income tax, any tax payment
- PAYROLL: Salary, wages, employee payments
- RENT: Office/building rent payment
- UTILITIES: Electricity, water, internet, phone
- ADMIN_EXPENSES: Office supplies, misc admin costs
- ATM_WITHDRAWAL: Cash withdrawal via ATM

EXTRACTION RULES:
1. Extract UP TO 50 transactions (not more to avoid token limits)
2. Detect dates in ANY format (DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, etc.)
3. Identify amounts (numbers with . or , as decimals)
4. Determine transaction type:
   - CREDIT: money coming IN (deposits, payments received, income)
   - DEBIT: money going OUT (payments, withdrawals, expenses)
5. Use context clues in description to assign correct category
6. Keep Greek and English text unchanged in descriptions
7. Generate sequential IDs: txn_001, txn_002, etc.

BANK STATEMENT DATA:
${cleanData}

REQUIRED OUTPUT FORMAT (ONLY VALID JSON, NO OTHER TEXT):
{
  "isFinancialData": true,
  "analysis": "Found X transactions from sample data",
  "transactions": [
    {
      "id": "txn_001",
      "date": "2025-11-08",
      "description": "Original transaction description",
      "amount": 2500.00,
      "type": "CREDIT",
      "categoryCode": "INVOICE_PAYMENT_FULL",
      "confidence": 0.95,
      "reasoning": "Brief reason"
    }
  ],
  "summary": {
    "totalTransactions": 50,
    "creditTotal": 45000.00,
    "debitTotal": 32000.00,
    "netCashFlow": 13000.00
  }
}

CRITICAL RULES:
1. Return ONLY the JSON object - no explanations, no markdown
2. Maximum 50 transactions to avoid incomplete JSON
3. Complete ALL JSON structures properly before stopping
4. If you cannot finish all transactions, stop at a complete transaction object`;

  try {
    console.log('🤖 Sending to Claude AI for analysis...');
    
    const response = await axios.post(CLAUDE_API_URL, {
      model: CLAUDE_MODEL,
      max_tokens: 16000, // Increased to handle larger responses
      temperature: 0.3, // Lower temperature for more consistent JSON
      messages: [{
        role: 'user',
        content: prompt
      }]
    }, {
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      timeout: 120000
    });

    const content = response.data.content[0].text;
    console.log('📥 Received response from Claude');
    
    const result = parseClaudeResponse(content);
    
    // Validate result structure
    if (!result.isFinancialData) {
      console.log('⚠️ Not financial data:', result.analysis);
      return result;
    }

    // Validate transactions
    if (!Array.isArray(result.transactions)) {
      throw new Error('Invalid response: transactions must be an array');
    }

    console.log('✅ Claude AI Analysis Complete');
    console.log(`📊 Extracted ${result.transactions.length} transactions`);
    console.log(`💰 Credits: €${result.summary?.creditTotal || 0}`);
    console.log(`💸 Debits: €${result.summary?.debitTotal || 0}`);
    console.log(`📈 Net Cash Flow: €${result.summary?.netCashFlow || 0}`);
    
    return result;

  } catch (error) {
    if (error.response) {
      console.error('❌ Claude API Error:', error.response.data);
      throw new Error(`Claude API Error: ${error.response.data.error?.message || 'Unknown error'}`);
    } else if (error.request) {
      console.error('❌ No response from Claude API');
      throw new Error('Network error: Could not reach Claude API');
    } else {
      console.error('❌ Error:', error.message);
      throw error;
    }
  }
}

// Categorize pre-structured transactions
async function categorizeTransactions(transactions) {
  if (!CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY not configured');
  }

  if (!Array.isArray(transactions) || transactions.length === 0) {
    throw new Error('No transactions to categorize');
  }

  // Process in batches of 20 to avoid token limits
  const batchSize = 20;
  const batches = [];
  
  for (let i = 0; i < transactions.length; i += batchSize) {
    batches.push(transactions.slice(i, i + batchSize));
  }

  console.log(`🔄 Processing ${transactions.length} transactions in ${batches.length} batches`);

  const allCategorizations = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`🤖 Categorizing batch ${i + 1}/${batches.length} (${batch.length} transactions)...`);

    const prompt = `You are a financial categorization expert for Greek business banking.

CATEGORIZE each transaction into ONE category:

CREDIT CATEGORIES (Money IN):
${categories.credit.map(c => `- ${c.code}: ${c.name}`).join('\n')}

DEBIT CATEGORIES (Money OUT):
${categories.debit.map(c => `- ${c.code}: ${c.name}`).join('\n')}

CATEGORIZATION GUIDELINES:
- INVOICE_PAYMENT: Look for client names, invoice references, payment terms
- SUPPLIER_PAYMENT: Look for vendor names, purchase orders
- PAYROLL: Look for employee names, salary terms
- TAX_PAYMENT: Look for tax office, VAT, ΦΠΑ, EFKA
- BANK_FEES: Look for commission, charges, fees
- RENT: Look for landlord, rent, lease

TRANSACTIONS TO CATEGORIZE:
${JSON.stringify(batch, null, 2)}

REQUIRED OUTPUT (ONLY VALID JSON ARRAY):
[
  {
    "id": "transaction_id_from_input",
    "categoryCode": "EXACT_CATEGORY_CODE",
    "confidence": 0.95,
    "reasoning": "Brief explanation"
  }
]

CRITICAL: Return ONLY the JSON array. No markdown, no explanations.`;

    try {
      const response = await axios.post(CLAUDE_API_URL, {
        model: CLAUDE_MODEL,
        max_tokens: 4000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      }, {
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      });

      const content = response.data.content[0].text;
      const categorizations = parseClaudeResponse(content);
      
      // Validate result
      if (!Array.isArray(categorizations)) {
        throw new Error('Invalid response: expected array of categorizations');
      }

      // Validate each categorization
      const allCodes = [...categories.credit, ...categories.debit].map(c => c.code);
      categorizations.forEach((cat, index) => {
        if (!cat.id || !cat.categoryCode) {
          throw new Error(`Invalid categorization at index ${index}: missing id or categoryCode`);
        }
        
        if (!allCodes.includes(cat.categoryCode)) {
          console.warn(`⚠️ Unknown category code: ${cat.categoryCode} for transaction ${cat.id}`);
        }
      });

      allCategorizations.push(...categorizations);
      console.log(`✅ Batch ${i + 1} complete: ${categorizations.length} categorized`);

    } catch (error) {
      console.error(`❌ Batch ${i + 1} failed:`, error.message);
      throw error;
    }
  }

  console.log(`✅ All categorization complete: ${allCategorizations.length} transactions`);
  return allCategorizations;
}

module.exports = {
  analyzeRawData,
  categorizeTransactions,
  categories,
  CLAUDE_MODEL
};