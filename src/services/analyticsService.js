const { getDatabase } = require('./transactionService');
const { v4: uuidv4 } = require('uuid');

// Detect recurring transactions
async function detectRecurringTransactions(minOccurrences = 3) {
  try {
    const db = getDatabase();
    
    const query = `
      SELECT 
        t.description,
        t.categoryCode,
        c.name_en as category_name,
        t.type,
        COUNT(*) as occurrence_count,
        AVG(t.amount) as avg_amount,
        MIN(t.amount) as min_amount,
        MAX(t.amount) as max_amount,
        MIN(t.date) as first_date,
        MAX(t.date) as last_date
      FROM transactions t
      LEFT JOIN categories c ON t.categoryCode = c.code
      GROUP BY t.description, t.categoryCode, t.type
      HAVING occurrence_count >= ?
      ORDER BY occurrence_count DESC
    `;

    const data = db.prepare(query).all(minOccurrences);
    console.log(`✅ Detected ${data.length} recurring transactions`);
    return data;
  } catch (error) {
    console.error('❌ Error in detectRecurringTransactions:', error.message);
    throw error;
  }
}

// Analyze transaction patterns by category
async function analyzeTransactionPatterns(categoryCode) {
  try {
    const db = getDatabase();
    
    const query = `
      SELECT 
        substr(t.date, 1, 7) as period,
        COUNT(*) as transaction_count,
        AVG(t.amount) as avg_amount,
        SUM(t.amount) as total_amount,
        MIN(t.amount) as min_amount,
        MAX(t.amount) as max_amount
      FROM transactions t
      WHERE t.categoryCode = ?
      GROUP BY substr(t.date, 1, 7)
      ORDER BY period DESC
      LIMIT 12
    `;

    const data = db.prepare(query).all(categoryCode);
    console.log(`✅ Retrieved patterns for ${categoryCode}`);
    return data;
  } catch (error) {
    console.error('❌ Error in analyzeTransactionPatterns:', error.message);
    throw error;
  }
}

// Calculate averages by category and period
async function getAveragesByCategory(categoryCode, period = 'monthly') {
  try {
    const db = getDatabase();
    
    let timeFormat = '%Y-%m'; // monthly
    if (period === 'daily') timeFormat = '%Y-%m-%d';
    if (period === 'yearly') timeFormat = '%Y';

// Use substr instead of strftime
    let dateExtract;
    if (period === 'daily') dateExtract = 't.date'; // Full date
    else if (period === 'yearly') dateExtract = 'substr(t.date, 1, 4)';
    else dateExtract = 'substr(t.date, 1, 7)'; // monthly

    const query = `
      SELECT 
        ${dateExtract} as period,
        AVG(t.amount) as avg_amount,
        COUNT(*) as transaction_count,
        SUM(t.amount) as total_amount
      FROM transactions t
      WHERE t.categoryCode = ?
      GROUP BY ${dateExtract}
      ORDER BY period DESC
    `;

    const data = db.prepare(query).all(categoryCode);
    console.log(`✅ Retrieved ${period} averages for ${categoryCode}`);
    return data;
  } catch (error) {
    console.error('❌ Error in getAveragesByCategory:', error.message);
    throw error;
  }
}

// Simple cash flow forecast
async function forecastCashFlow(months = 3) {
  try {
    const db = getDatabase();
    
    // Get average monthly income and expenses
    const avgQuery = `
      SELECT 
        t.type,
        AVG(t.amount) as avg_amount,
        COUNT(*) as avg_count
      FROM transactions t
      GROUP BY t.type
    `;

    const averages = db.prepare(avgQuery).all();
    
    const creditAvg = averages.find(a => a.type === 'CREDIT')?.avg_amount || 0;
    const debitAvg = averages.find(a => a.type === 'DEBIT')?.avg_amount || 0;

    const forecast = [];
    const today = new Date();

    for (let i = 1; i <= months; i++) {
      const forecastDate = new Date(today);
      forecastDate.setMonth(forecastDate.getMonth() + i);
      
      forecast.push({
        month: forecastDate.toISOString().substring(0, 7),
        predicted_income: Math.round(creditAvg * 100) / 100,
        predicted_expenses: Math.round(debitAvg * 100) / 100,
        net_flow: Math.round((creditAvg - debitAvg) * 100) / 100,
        confidence: 0.7
      });
    }

    console.log(`✅ Generated ${months} month cash flow forecast`);
    return forecast;
  } catch (error) {
    console.error('❌ Error in forecastCashFlow:', error.message);
    throw error;
  }
}

// Predict next transaction for category
async function predictNextTransaction(categoryCode) {
  try {
    const db = getDatabase();
    
    const query = `
      SELECT 
        t.description,
        t.amount,
        t.date,
        ROW_NUMBER() OVER (ORDER BY t.date DESC) as recency
      FROM transactions t
      WHERE t.categoryCode = ?
      ORDER BY t.date DESC
      LIMIT 5
    `;

    const recentTxns = db.prepare(query).all(categoryCode);
    
    if (recentTxns.length === 0) {
      return null;
    }

    // Calculate average amount and days between
    const avgAmount = recentTxns.reduce((sum, t) => sum + t.amount, 0) / recentTxns.length;
    
    // Estimate next date (rough estimate)
    const lastDate = new Date(recentTxns.date);
    const firstDate = new Date(recentTxns[recentTxns.length - 1].date);
    const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
    const daysBetween = daysDiff / recentTxns.length;
    
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + daysBetween);

    console.log(`✅ Generated prediction for ${categoryCode}`);
    return {
      category_code: categoryCode,
      predicted_amount: Math.round(avgAmount * 100) / 100,
      predicted_date: nextDate.toISOString().split('T'),
      confidence: 0.65,
      based_on_transactions: recentTxns.length
    };
  } catch (error) {
    console.error('❌ Error in predictNextTransaction:', error.message);
    throw error;
  }
}

module.exports = {
  detectRecurringTransactions,
  analyzeTransactionPatterns,
  getAveragesByCategory,
  forecastCashFlow,
  predictNextTransaction
};

