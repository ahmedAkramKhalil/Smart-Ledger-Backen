const { getDatabase } = require('./transactionService');

// Income & Expenses Summary by Category
async function getIncomeExpensesSummary(filters = {}) {
  try {
    const db = getDatabase();
    
    let query = `
      SELECT 
        c.code,
        c.name_en,
        c.name_el,
        c.type as category_type,
        COUNT(t.id) as transaction_count,
        SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END) as credit_total,
        SUM(CASE WHEN t.type = 'DEBIT' THEN t.amount ELSE 0 END) as debit_total,
        SUM(t.amount) as total_amount,
        AVG(t.amount) as average_amount,
        AVG(t.confidence) as avg_confidence,
        MIN(t.date) as first_date,
        MAX(t.date) as last_date
      FROM categories c
      LEFT JOIN transactions t ON c.code = t.categoryCode
    `;
    
    const conditions = [];
    const params = [];

    if (filters.dateFrom) {
      conditions.push('t.date >= ?');
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      conditions.push('t.date <= ?');
      params.push(filters.dateTo);
    }

    if (filters.accountId) {
      conditions.push('t.account_id = ?');
      params.push(filters.accountId);
    }

    if (filters.type) {
      conditions.push('c.type = ?');
      params.push(filters.type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY c.code, c.name_en, c.name_el, c.type HAVING transaction_count > 0 ORDER BY total_amount DESC';

    const data = db.prepare(query).all(...params);
    console.log(`✅ Retrieved ${data.length} category summaries`);
    return data;
  } catch (error) {
    console.error('❌ Error in getIncomeExpensesSummary:', error.message);
    throw error;
  }
}


async function getCategoryAnalysis(filters = {}) {
  try {
    const db = getDatabase();
    
    // Build WHERE clause for filters
    let whereConditions = [];
    let params = [];
    
    if (filters.dateFrom) {
      whereConditions.push('t.date >= ?');
      params.push(filters.dateFrom);
    }
    
    if (filters.dateTo) {
      whereConditions.push('t.date <= ?');
      params.push(filters.dateTo);
    }
    
    if (filters.accountId) {
      whereConditions.push('t.account_id = ?');
      params.push(filters.accountId);
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';

    // Main category analysis query with enhanced metrics
    const query = `
      SELECT 
        c.code,
        c.name_en,
        c.name_el,
        c.type as category_type,
        COUNT(t.id) as transaction_count,
        
        -- Separate credit and debit totals
        SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END) as credit_total,
        SUM(CASE WHEN t.type = 'DEBIT' THEN t.amount ELSE 0 END) as debit_total,
        SUM(t.amount) as total_amount,
        
        AVG(t.amount) as average_amount,
        MIN(t.amount) as min_amount,
        MAX(t.amount) as max_amount,
        ROUND(AVG(t.confidence), 3) as avg_confidence,
        
        -- Count by type
        COUNT(CASE WHEN t.type = 'CREDIT' THEN 1 END) as credit_count,
        COUNT(CASE WHEN t.type = 'DEBIT' THEN 1 END) as debit_count,
        
        -- Frequency metrics
        COUNT(DISTINCT DATE(t.date)) as active_days,
        MIN(t.date) as first_transaction_date,
        MAX(t.date) as last_transaction_date,
        
        -- Confidence breakdown
        COUNT(CASE WHEN t.confidence >= 0.9 THEN 1 END) as high_confidence_count,
        COUNT(CASE WHEN t.confidence >= 0.7 AND t.confidence < 0.9 THEN 1 END) as medium_confidence_count,
        COUNT(CASE WHEN t.confidence < 0.7 THEN 1 END) as low_confidence_count,
        
        -- Recent activity (last 30 days)
        COUNT(CASE 
          WHEN DATE(t.date) >= DATE('now', '-30 days') 
          THEN 1 
        END) as recent_transaction_count,
        SUM(CASE 
          WHEN DATE(t.date) >= DATE('now', '-30 days') 
          THEN t.amount 
          ELSE 0 
        END) as recent_total_amount
        
      FROM categories c
      LEFT JOIN transactions t ON c.code = t.categoryCode
      ${whereClause}
      GROUP BY c.code, c.name_en, c.name_el, c.type
      HAVING transaction_count > 0
      ORDER BY total_amount DESC
    `;

    const data = db.prepare(query).all(...params);
    
    // Calculate additional insights
    const totalTransactions = data.reduce((sum, cat) => sum + cat.transaction_count, 0);
    const totalAmount = data.reduce((sum, cat) => sum + Math.abs(cat.total_amount), 0);
    
    // Enhance each category with calculated metrics
    const enhanced = data.map(category => {
      // Calculate percentage of total
      const percentageOfTotal = totalAmount !== 0 
        ? ((Math.abs(category.total_amount) / totalAmount) * 100).toFixed(2)
        : 0;
      
      const percentageOfTransactions = totalTransactions !== 0
        ? ((category.transaction_count / totalTransactions) * 100).toFixed(2)
        : 0;
      
      // Calculate transaction frequency (per day)
      const daysBetween = category.active_days || 1;
      const frequency = (category.transaction_count / daysBetween).toFixed(2);
      
      // Calculate trend (comparing recent vs overall average)
      const overallAverage = category.average_amount;
      const recentAverage = category.recent_transaction_count > 0
        ? category.recent_total_amount / category.recent_transaction_count
        : 0;
      
      const trend = recentAverage > overallAverage * 1.1 ? 'increasing' 
                  : recentAverage < overallAverage * 0.9 ? 'decreasing' 
                  : 'stable';
      
      // Confidence level
      const highConfidencePct = category.transaction_count > 0
        ? ((category.high_confidence_count / category.transaction_count) * 100).toFixed(1)
        : 0;
      
      return {
        // Original fields (maintain structure)
        code: category.code,
        name_en: category.name_en,
        name_el: category.name_el,
        category_type: category.category_type,
        transaction_count: category.transaction_count,
        total_amount: category.total_amount,
        average_amount: category.average_amount,
        min_amount: category.min_amount,
        max_amount: category.max_amount,
        avg_confidence: category.avg_confidence,
        
        // Enhanced fields
        credit_total: category.credit_total,
        debit_total: category.debit_total,
        credit_count: category.credit_count,
        debit_count: category.debit_count,
        
        // Activity metrics
        active_days: category.active_days,
        first_transaction_date: category.first_transaction_date,
        last_transaction_date: category.last_transaction_date,
        frequency_per_day: parseFloat(frequency),
        
        // Confidence breakdown
        high_confidence_count: category.high_confidence_count,
        medium_confidence_count: category.medium_confidence_count,
        low_confidence_count: category.low_confidence_count,
        high_confidence_percentage: parseFloat(highConfidencePct),
        
        // Recent activity
        recent_transaction_count: category.recent_transaction_count,
        recent_total_amount: category.recent_total_amount,
        trend: trend,
        
        // Percentage metrics
        percentage_of_total: parseFloat(percentageOfTotal),
        percentage_of_transactions: parseFloat(percentageOfTransactions)
      };
    });
    
    console.log(`✅ Retrieved ${enhanced.length} category analyses with enhanced metrics`);
    
    return enhanced;
    
  } catch (error) {
    console.error('❌ Error in getCategoryAnalysis:', error.message);
    throw error;
  }
}


async function getCashFlowReport(filters = {}) {
  try {
    const db = getDatabase();
    
    // Always group by day for maximum granularity
    // Frontend will handle aggregation if needed
    const groupBy = "DATE(t.date)";
    const periodLabel = "day";
    
    let query = `
      SELECT 
        ${groupBy} as period,
        substr(t.date, 1, 4) as year,
        substr(t.date, 6, 2) as month,
        substr(t.date, 9, 2) as day,
        SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END) as total_income,
        SUM(CASE WHEN t.type = 'DEBIT' THEN t.amount ELSE 0 END) as total_expenses,
        SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE -t.amount END) as net_cash_flow,
        COUNT(CASE WHEN t.type = 'CREDIT' THEN 1 END) as income_count,
        COUNT(CASE WHEN t.type = 'DEBIT' THEN 1 END) as expense_count,
        '${periodLabel}' as period_type
      FROM transactions t
      WHERE 1=1
    `;
    const params = [];

    if (filters.dateFrom) {
      query += ' AND t.date >= ?';
      params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      query += ' AND t.date <= ?';
      params.push(filters.dateTo);
    }

    if (filters.accountId) {
      query += ' AND t.account_id = ?';
      params.push(filters.accountId);
    }

    query += ` GROUP BY ${groupBy} ORDER BY period ASC`;

    const data = db.prepare(query).all(...params);
    console.log(`✅ Retrieved ${data.length} cash flow periods (${periodLabel} grouping)`);
    return data;
  } catch (error) {
    console.error('❌ Error in getCashFlowReport:', error.message);
    return [];
  }
}
// Top Transactions
async function getTopTransactions(limit = 10, type = null) {
  try {
    const db = getDatabase();
    
    let query = `
      SELECT 
        t.id,
        t.date,
        t.description,
        t.amount,
        t.type,
        c.name_en as category_name,
        t.counterparty,
        t.confidence
      FROM transactions t
      LEFT JOIN categories c ON t.categoryCode = c.code
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      query += ' AND t.type = ?';
      params.push(type);
    }

    query += ' ORDER BY t.amount DESC LIMIT ?';
    params.push(limit);

    const data = db.prepare(query).all(...params);
    console.log(`✅ Retrieved top ${data.length} transactions`);
    return data;
  } catch (error) {
    console.error('❌ Error in getTopTransactions:', error.message);
    throw error;
  }
}


// Get available date range from transactions

// Reconciliation Status
async function getReconciliationStatus(accountId = null) {
  try {
    const db = getDatabase();
    
    let query = `
      SELECT 
        CASE WHEN t.reconciled = 1 THEN 'Reconciled' ELSE 'Pending' END as status,
        COUNT(t.id) as count,
        SUM(t.amount) as total_amount,
        ROUND(SUM(t.amount) * 100.0 / (SELECT SUM(amount) FROM transactions), 2) as percentage
      FROM transactions t
      WHERE 1=1
    `;
    const params = [];

    if (accountId) {
      query += ' AND t.account_id = ?';
      params.push(accountId);
    }

    query += ' GROUP BY t.reconciled';

    const data = db.prepare(query).all(...params);
    console.log(`✅ Retrieved reconciliation status`);
    return data;
  } catch (error) {
    console.error('❌ Error in getReconciliationStatus:', error.message);
    throw error;
  }
}

// Monthly Comparison
async function getMonthlyComparison(year = null) {
  try {
    const db = getDatabase();
    
    const currentYear = year || new Date().getFullYear();
    
    const query = `
      SELECT 
        substr(t.date, 6, 2) as month,
        CASE substr(t.date, 6, 2)
          WHEN '01' THEN 'January'
          WHEN '02' THEN 'February'
          WHEN '03' THEN 'March'
          WHEN '04' THEN 'April'
          WHEN '05' THEN 'May'
          WHEN '06' THEN 'June'
          WHEN '07' THEN 'July'
          WHEN '08' THEN 'August'
          WHEN '09' THEN 'September'
          WHEN '10' THEN 'October'
          WHEN '11' THEN 'November'
          WHEN '12' THEN 'December'
        END as month_name,
        t.type,
        SUM(t.amount) as total_amount,
        COUNT(t.id) as transaction_count
      FROM transactions t
      WHERE substr(t.date, 1, 4) = ?
      GROUP BY substr(t.date, 6, 2), t.type
      ORDER BY month ASC
    `;
    const data = db.prepare(query).all(currentYear.toString());
    console.log(`✅ Retrieved monthly comparison for ${currentYear}`);
    return data;
  } catch (error) {
    console.error('❌ Error in getMonthlyComparison:', error.message);
    throw error;
  }
}

// Dashboard Summary
async function getDashboardSummary(accountId = null) {
  try {
    const db = getDatabase();
    
    let txnQuery = 'SELECT 1 FROM transactions WHERE 1=1';
    const params = [];
    if (accountId) {
      txnQuery += ' AND account_id = ?';
      params.push(accountId);
    }
    txnQuery += ' LIMIT 1';

    const query = `
      SELECT 
        (SELECT COUNT(*) FROM transactions t ${accountId ? 'WHERE t.account_id = ?' : ''}) as total_transactions,
        (SELECT COUNT(*) FROM transactions t WHERE t.type = 'CREDIT' ${accountId ? 'AND t.account_id = ?' : ''}) as total_credits,
        (SELECT COUNT(*) FROM transactions t WHERE t.type = 'DEBIT' ${accountId ? 'AND t.account_id = ?' : ''}) as total_debits,
        (SELECT SUM(t.amount) FROM transactions t WHERE t.type = 'CREDIT' ${accountId ? 'AND t.account_id = ?' : ''}) as credit_total,
        (SELECT SUM(t.amount) FROM transactions t WHERE t.type = 'DEBIT' ${accountId ? 'AND t.account_id = ?' : ''}) as debit_total,
        (SELECT COUNT(*) FROM transactions t WHERE t.reconciled = 1 ${accountId ? 'AND t.account_id = ?' : ''}) as reconciled_count
    `;

    const buildParams = () => {
      const p = [];
      if (accountId) {
        p.push(accountId, accountId, accountId, accountId, accountId, accountId);
      }
      return p;
    };

    const data = db.prepare(query).get(...buildParams());
    console.log(`✅ Retrieved dashboard summary`);
    return {
      total_transactions: data.total_transactions || 0,
      total_credits: data.total_credits || 0,
      total_debits: data.total_debits || 0,
      credit_total: data.credit_total || 0,
      debit_total: data.debit_total || 0,
      reconciled_count: data.reconciled_count || 0,
      net_flow: (data.credit_total || 0) - (data.debit_total || 0)
    };
  } catch (error) {
    console.error('❌ Error in getDashboardSummary:', error.message);
    throw error;
  }
}

module.exports = {
  getIncomeExpensesSummary,
  getCashFlowReport,
  getCategoryAnalysis,
  getTopTransactions,
  getReconciliationStatus,
  getMonthlyComparison,
  getDashboardSummary
};

