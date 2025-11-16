const express = require('express');
const router = express.Router();
const { getDatabase } = require('../services/transactionService'); // ADD THIS LINE IF MISSING

const {
  getIncomeExpensesSummary,
  getCashFlowReport,
  getCategoryAnalysis,
  getTopTransactions,
  getReconciliationStatus,
  getMonthlyComparison,
  getDashboardSummary
} = require('../services/reportService');
const {
  detectRecurringTransactions,
  analyzeTransactionPatterns,
  forecastCashFlow,
  predictNextTransaction
} = require('../services/analyticsService');







// Income & Expenses
router.get('/income-expenses', async (req, res) => {
  try {
    const data = await getIncomeExpensesSummary(req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




router.get('/date-range', async (req, res) => {
  try {
    const db = getDatabase();
    
    const query = `
      SELECT 
        MIN(date) as min_date,
        MAX(date) as max_date,
        COUNT(*) as total_transactions
      FROM transactions
    `;
    
    const result = db.prepare(query).get();
    
    if (!result || !result.min_date) {
      return res.json({
        success: true,
        hasData: false,
        min_date: null,
        max_date: null,
        total_transactions: 0
      });
    }
    
    // Get the last month with data
    const maxDate = new Date(result.max_date);
    const lastMonthStart = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    const lastMonthEnd = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
    
    res.json({
      success: true,
      hasData: true,
      min_date: result.min_date,
      max_date: result.max_date,
      total_transactions: result.total_transactions,
      suggested_start: lastMonthStart.toISOString().split('T')[0],
      suggested_end: lastMonthEnd.toISOString().split('T')[0]
    });
    
  } catch (error) {
    console.error('Error getting date range:', error);
    res.status(500).json({ error: error.message });
  }
});



// Cash Flow
router.get('/cash-flow', async (req, res) => {
  try {
    const data = await getCashFlowReport(req.query);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Category Analysis
router.get('/category-analysis', async (req, res) => {
  try {
    const data = await getCategoryAnalysis();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Top Transactions
router.get('/top-transactions', async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const type = req.query.type || null;
    const data = await getTopTransactions(limit, type);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reconciliation Status
router.get('/reconciliation-status', async (req, res) => {
  try {
    const data = await getReconciliationStatus(req.query.accountId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Monthly Comparison
router.get('/monthly-comparison', async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const data = await getMonthlyComparison(year);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard Summary
router.get('/dashboard', async (req, res) => {
  try {
    const data = await getDashboardSummary(req.query.accountId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recurring Transactions
router.get('/recurring', async (req, res) => {
  try {
    const minOccurrences = req.query.minOccurrences || 3;
    const data = await detectRecurringTransactions(minOccurrences);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transaction Patterns
router.get('/patterns/:categoryCode', async (req, res) => {
  try {
    const data = await analyzeTransactionPatterns(req.params.categoryCode);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cash Flow Forecast
router.get('/forecast/cash-flow', async (req, res) => {
  try {
    const months = req.query.months || 3;
    const data = await forecastCashFlow(months);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Predict Transaction
router.get('/predictions/:categoryCode', async (req, res) => {
  try {
    const data = await predictNextTransaction(req.params.categoryCode);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Get recurring predictions from database
router.get('/recurring', async (req, res) => {
  try {
    const db = getDatabase();
    const { minOccurrences = 2 } = req.query;
    
    const query = `
      SELECT 
        rp.*,
        c.name_en,
        c.name_el
      FROM recurring_predictions rp
      LEFT JOIN categories c ON rp.categoryCode = c.code
      WHERE rp.occurrence_count >= ?
      ORDER BY rp.avg_amount DESC
    `;
    
    const predictions = db.prepare(query).all(minOccurrences);
    
    console.log(`✅ Retrieved ${predictions.length} recurring predictions`);
    res.json(predictions);
  } catch (error) {
    console.error('Error fetching recurring predictions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get cash flow forecast from database
router.get('/forecast/cash-flow', async (req, res) => {
  try {
    const db = getDatabase();
    const { months = 3 } = req.query;
    
    const query = `
      SELECT *
      FROM cash_flow_forecasts
      ORDER BY month ASC
      LIMIT ?
    `;
    
    const forecasts = db.prepare(query).all(parseInt(months));
    
    console.log(`✅ Retrieved ${forecasts.length} forecast months`);
    res.json(forecasts);
  } catch (error) {
    console.error('Error fetching forecasts:', error);
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
