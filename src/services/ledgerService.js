const { getDatabase } = require('./transactionService');
const { updateAccountBalance } = require('./accountService');
const { v4: uuidv4 } = require('uuid');

// Create ledger entry from transaction
async function createLedgerEntry(transaction, accountId) {
  try {
    const db = getDatabase();
    
    console.log(`📝 Creating ledger entry for transaction: ${transaction.id}`);

    // Get last entry balance
    const lastEntry = db.prepare(`
      SELECT running_balance 
      FROM ledger_entries 
      WHERE account_id = ? 
      ORDER BY entry_date DESC, created_at DESC 
      LIMIT 1
    `).get(accountId);

    const previousBalance = lastEntry?.running_balance || 0;
    
    // Calculate new balance
    const amount = Math.abs(parseFloat(transaction.amount));
    const entryType = transaction.type; // 'CREDIT' or 'DEBIT'
    
    const newBalance = entryType === 'CREDIT' 
      ? previousBalance + amount 
      : previousBalance - amount;

    const entry = {
      id: uuidv4(),
      account_id: accountId,
      transaction_id: transaction.id,
      entry_date: transaction.date,
      entry_type: entryType,
      amount: amount,
      running_balance: newBalance,
      description: transaction.description,
      reconciled: 0,
      notes: transaction.reasoning || '',
      created_at: new Date().toISOString()
    };

    const stmt = db.prepare(`
      INSERT INTO ledger_entries (
        id, account_id, transaction_id, entry_date, 
        entry_type, amount, running_balance, description,
        reconciled, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      entry.id, entry.account_id, entry.transaction_id,
      entry.entry_date, entry.entry_type, entry.amount,
      entry.running_balance, entry.description, entry.reconciled,
      entry.notes, entry.created_at
    );

    // Update transactions table with ledger entry reference
    db.prepare('UPDATE transactions SET ledger_entry_id = ? WHERE id = ?').run(
      entry.id,
      transaction.id
    );

    // Update account balance
    await updateAccountBalance(accountId);

    console.log('✅ Ledger entry created:', entry.id);
    return entry;
  } catch (error) {
    console.error('❌ Error creating ledger entry:', error.message);
    throw error;
  }
}

// Get account ledger
async function getAccountLedger(accountId, dateFrom = null, dateTo = null) {
  try {
    const db = getDatabase();
    
    let query = `
      SELECT 
        le.*,
        t.description as transaction_description,
        t.counterparty
      FROM ledger_entries le
      LEFT JOIN transactions t ON le.transaction_id = t.id
      WHERE le.account_id = ?
    `;
    const params = [accountId];

    if (dateFrom) {
      query += ' AND le.entry_date >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ' AND le.entry_date <= ?';
      params.push(dateTo);
    }

    query += ' ORDER BY le.entry_date ASC, le.created_at ASC';

    const ledger = db.prepare(query).all(...params);
    console.log(`✅ Retrieved ${ledger.length} ledger entries`);
    return ledger;
  } catch (error) {
    console.error('❌ Error fetching ledger:', error.message);
    throw error;
  }
}

// Reconcile entry
async function reconcileLedgerEntry(entryId, reconciliationDate = null) {
  try {
    const db = getDatabase();
    
    db.prepare(`
      UPDATE ledger_entries 
      SET reconciled = 1, reconciliation_date = ?
      WHERE id = ?
    `).run(reconciliationDate || new Date().toISOString(), entryId);

    console.log('✅ Ledger entry reconciled:', entryId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error reconciling entry:', error.message);
    throw error;
  }
}

// Get account summary
async function getAccountSummary(accountId, dateFrom = null, dateTo = null) {
  try {
    const db = getDatabase();
    
    let query = `
      SELECT 
        SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) as total_credits,
        SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as total_debits,
        COUNT(*) as total_entries,
        SUM(CASE WHEN reconciled = 1 THEN 1 ELSE 0 END) as reconciled_entries,
        MAX(running_balance) as final_balance
      FROM ledger_entries
      WHERE account_id = ?
    `;
    const params = [accountId];

    if (dateFrom) {
      query += ' AND entry_date >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      query += ' AND entry_date <= ?';
      params.push(dateTo);
    }

    const summary = db.prepare(query).get(...params);
    
    return {
      account_id: accountId,
      total_credits: summary.total_credits || 0,
      total_debits: summary.total_debits || 0,
      net_flow: (summary.total_credits || 0) - (summary.total_debits || 0),
      total_entries: summary.total_entries || 0,
      reconciled_entries: summary.reconciled_entries || 0,
      final_balance: summary.final_balance || 0
    };
  } catch (error) {
    console.error('❌ Error getting summary:', error.message);
    throw error;
  }
}

module.exports = {
  createLedgerEntry,
  getAccountLedger,
  reconcileLedgerEntry,
  getAccountSummary
};

