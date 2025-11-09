const express = require('express');
const router = express.Router();
const { getTransactions } = require('../services/transactionService');

router.post('/csv', async (req, res) => {
  try {
    const transactions = await getTransactions({});
    
    const csv = [
      ['Date', 'Description', 'Amount', 'Type', 'Category', 'Confidence', 'Counterparty'].join(','),
      ...transactions.map(t => [
        t.date,
        `"${t.description}"`,
        t.amount,
        t.type,
        t.categoryCode,
        t.aiConfidence,
        `"${t.counterparty}"`
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

