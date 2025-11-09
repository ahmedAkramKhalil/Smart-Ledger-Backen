const express = require('express');
const router = express.Router();
const { getTransactions, updateTransaction } = require('../services/transactionService');

router.get('/', async (req, res) => {
  try {
    const { category, type, dateFrom, dateTo, search, limit = 50, offset = 0 } = req.query;
    const transactions = await getTransactions({
      category,
      type,
      dateFrom,
      dateTo,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { get } = require('../config/database');
    const transaction = await get(
      'SELECT * FROM transactions WHERE id = ?',
      [req.params.id]
    );
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { categoryCode, notes } = req.body;
    const result = await updateTransaction(req.params.id, { categoryCode, notes });
    res.json({ success: true, transaction: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

