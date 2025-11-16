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

      let jsonStr = match[0];

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
      throw new Error('CLAUDE_API_KEY not set in environment');
    }

    if (!rawData || typeof rawData !== 'string' || rawData.trim().length === 0) {
      throw new Error('Invalid input data');
    }

    // Take 50% sample (up to 20KB)
    const totalLength = rawData.length;
    const maxSize = 20000; // 20KB limit
    const sampleSize = Math.min(Math.floor(totalLength * 0.6), maxSize);
    const sampleData = rawData.substring(0, sampleSize).trim();

    console.log(`📊 File: ${totalLength} bytes`);
    console.log(`📊 Sample: ${sampleData.length} bytes`);

    // Enhanced Prompt with EXACT database categories and predictions
    const prompt = `You are a financial analyst AI. Extract up to 100 transactions from this Greek bank statement and provide predictions.

CRITICAL RULES:
1. Use ONLY these category codes (match EXACTLY):

INCOME (CREDIT):
- INVOICE_PAYMENT_FULL: Full invoice payment received
- INVOICE_PAYMENT_PARTIAL: Partial invoice payment received
- CAPITAL_RAISE: Capital increase from shareholders
- INTEREST_INCOME: Bank interest earned
- EXPENSE_REFUND: Refund of previously paid expenses
- LOAN_RECEIVED: Loan funds received
- INTERCOMPANY_IN: Transfer from related company
- ATM_DEPOSIT: Cash deposited via ATM
- UNCATEGORIZED_IN: Unknown income source

EXPENSES (DEBIT):
- SUPPLIER_PAYMENT: Payment to supplier/vendor
- LOAN_REPAYMENT: Loan principal or interest payment
- BANK_FEES: Bank charges and fees
- TAX_PAYMENT: Tax payments (VAT, income tax, etc)
- PAYROLL: Employee salaries and wages
- RENT: Office/property rent payment
- UTILITIES: Electricity, water, internet, phone
- ADMIN_EXPENSES: Office supplies, admin costs
- ATM_WITHDRAWAL: Cash withdrawn from ATM

2. Keep Greek text in descriptions (don't translate)
3. Amounts: positive for CREDIT, negative for DEBIT
4. Confidence: 0.0 to 1.0 based on certainty
5. Predict recurring patterns and next 3 months forecast

BANK STATEMENT DATA:
${sampleData}

Return ONLY this JSON structure (NO markdown, NO explanations):

{
  "isFinancialData": true,
  "account": {
    "accountNumber": "GR1234567890",
    "accountName": "Business Account",
    "currency": "EUR"
  },
  "transactions": [
    {
      "id": "txn_001",
      "date": "2024-11-08",
      "description": "ΠΛΗΡΩΜΗ ΤΙΜΟΛΟΓΙΟΥ ΑΠΟ ΠΕΛΑΤΗ",
      "amount": 1500.50,
      "type": "CREDIT",
      "categoryCode": "INVOICE_PAYMENT_FULL",
      "confidence": 0.95,
      "counterparty": "CUSTOMER NAME",
      "reasoning": "Matching invoice payment pattern"
    }
  ],
  "predictions": {
    "recurring": [
      {
        "description": "ΜΙΣΘΟΔΟΣΙΑ",
        "categoryCode": "PAYROLL",
        "type": "DEBIT",
        "avgAmount": -5000,
        "frequency": "monthly",
        "confidence": 0.9,
        "nextExpectedDate": "2024-12-01",
        "occurrenceCount": 3
      }
    ],
    "forecast": [
      {
        "month": "2024-12",
        "predictedIncome": 25000,
        "predictedExpenses": -18000,
        "netFlow": 7000,
        "confidence": 0.75
      },
      {
        "month": "2025-01",
        "predictedIncome": 26000,
        "predictedExpenses": -19000,
        "netFlow": 7000,
        "confidence": 0.65
      },
      {
        "month": "2025-02",
        "predictedIncome": 27000,
        "predictedExpenses": -20000,
        "netFlow": 7000,
        "confidence": 0.55
      }
    ]
  },
  "summary": {
    "totalTransactions": 1,
    "creditTotal": 1500.50,
    "debitTotal": 0,
    "netCashFlow": 1500.50,
    "dateRange": {
      "from": "2024-11-01",
      "to": "2024-11-30"
    }
  },
  "analysis": "Detected 1 transactions with high confidence categorization"
}`;

    console.log('📨 Calling Claude API...');

    // Call Claude
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: CLAUDE_MODEL,
        max_tokens: 12000,
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
        timeout: 90000
      }
    );

    console.log('✅ Got response from Claude');

    // Validate response structure
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

    // Parse response
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
    console.log(`✅ Predictions: ${result.predictions?.recurring?.length || 0} recurring, ${result.predictions?.forecast?.length || 0} forecasts`);
    
    return result;

  } catch (error) {
    console.error('❌ Claude error:', error.message);

    if (error.response && error.response.data) {
      console.error('API error:', error.response.data);
    }

    throw new Error(`Claude failed: ${error.message}`);
  }
}

// CRITICAL: Export the function
module.exports = {
  analyzeRawData
};