const express = require('express');
const router = express.Router();
const { getReportSummary, getCategoryBreakdown } = require('../services/transactionService');

router.get('/summary', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const summary = await getReportSummary({ dateFrom, dateTo });
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/breakdown', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const breakdown = await getCategoryBreakdown({ dateFrom, dateTo });
    res.json(breakdown);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

