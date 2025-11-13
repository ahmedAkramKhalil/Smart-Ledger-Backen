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
        t.type,
        COUNT(t.id) as transaction_count,
        SUM(t.amount) as total_amount,
        AVG(t.amount) as average_amount,
        AVG(t.confidence) as avg_confidence,
        MIN(t.date) as first_date,
        MAX(t.date) as last_date
        FROM categories c
        LEFT JOIN transactions t ON c.code = t.categoryCode 
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

    if (filters.type) {
      query += ' AND c.type = ?';
      params.push(filters.type);
    }

    query += ' GROUP BY c.code, c.name_en, c.name_el, t.type ORDER BY total_amount DESC';

    const data = db.prepare(query).all(...params);
    console.log(`✅ Retrieved ${data.length} category summaries`);
    return data;
  } catch (error) {
    console.error('❌ Error in getIncomeExpensesSummary:', error.message);
    throw error;
  }
}

// Cash Flow Report (Monthly)
async function getCashFlowReport(filters = {}) {
  try {
    const db = getDatabase();
    
    let query = `
      SELECT 
        substr(t.date, 1, 7) as period,
        substr(t.date, 1, 4) as year,
        substr(t.date, 6, 2) as month,
        SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE 0 END) as total_income,
        SUM(CASE WHEN t.type = 'DEBIT' THEN t.amount ELSE 0 END) as total_expenses,
        SUM(CASE WHEN t.type = 'CREDIT' THEN t.amount ELSE -t.amount END) as net_cash_flow,
        COUNT(CASE WHEN t.type = 'CREDIT' THEN 1 END) as income_count,
        COUNT(CASE WHEN t.type = 'DEBIT' THEN 1 END) as expense_count
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

    query += ' GROUP BY substr(t.date, 1, 7) ORDER BY period DESC';

    const data = db.prepare(query).all(...params);
    console.log(`✅ Retrieved ${data.length} cash flow periods`);
    return data;
  } catch (error) {
    console.error('❌ Error in getCashFlowReport:', error.message);
    return [];  // Return empty array instead of throwing
  }
}

// Category Analysis (Detailed)
async function getCategoryAnalysis(filters = {}) {
  try {
    const db = getDatabase();
    
    const query = `
      SELECT 
        c.code,
        c.name_en,
        c.name_el,
        c.type,
        COUNT(t.id) as transaction_count,
        SUM(t.amount) as total_amount,
        AVG(t.amount) as average_amount,
        MIN(t.amount) as min_amount,
        MAX(t.amount) as max_amount,
        ROUND(AVG(t.confidence), 3) as avg_confidence
      FROM categories c
      LEFT JOIN transactions t ON c.code = t.category_code
      GROUP BY c.code, c.name_en, c.name_el, c.type
      HAVING transaction_count > 0
      ORDER BY total_amount DESC
    `;

    const data = db.prepare(query).all();
    console.log(`✅ Retrieved ${data.length} category analyses`);
    return data;
  } catch (error) {
    console.error('❌ Error in getCategoryAnalysis:', error.message);
    throw error;
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

