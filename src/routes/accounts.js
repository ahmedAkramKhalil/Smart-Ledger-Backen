const express = require('express');
const router = express.Router();
const {
  createAccount,
  getAllAccounts,
  getAccountById,
  updateAccount,
  getAccountBalance
} = require('../services/accountService');
const {
  getAccountLedger,
  getAccountSummary,
  reconcileLedgerEntry
} = require('../services/ledgerService');

// Create account
router.post('/', async (req, res) => {
  try {
    console.log('📝 Creating account...');
    const account = await createAccount(req.body);
    res.json({ success: true, account });
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get all accounts
router.get('/', async (req, res) => {
  try {
    const accounts = await getAllAccounts();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get account by ID
router.get('/:id', async (req, res) => {
  try {
    const account = await getAccountById(req.params.id);
    res.json(account);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Update account
router.put('/:id', async (req, res) => {
  try {
    const account = await updateAccount(req.params.id, req.body);
    res.json({ success: true, account });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get account balance
router.get('/:id/balance', async (req, res) => {
  try {
    const balance = await getAccountBalance(req.params.id);
    res.json(balance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get account ledger
router.get('/:id/ledger', async (req, res) => {
  try {
    const ledger = await getAccountLedger(
      req.params.id,
      req.query.dateFrom,
      req.query.dateTo
    );
    res.json(ledger);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get account summary
router.get('/:id/summary', async (req, res) => {
  try {
    const summary = await getAccountSummary(
      req.params.id,
      req.query.dateFrom,
      req.query.dateTo
    );
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reconcile entry
router.post('/:id/reconcile/:entryId', async (req, res) => {
  try {
    await reconcileLedgerEntry(req.params.entryId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

