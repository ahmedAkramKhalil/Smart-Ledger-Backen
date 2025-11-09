const { run, get, all } = require('../config/database');

async function insertTransactions(transactions, uploadId) {
  for (const txn of transactions) {
    await run(`
      INSERT INTO transactions (
        id, uploadId, date, description, amount, type, 
        categoryCode, aiConfidence, counterparty, isManual
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      txn.id,
      uploadId,
      txn.date,
      txn.description,
      txn.amount,
      txn.type,
      txn.categoryCode || 'UNCATEGORIZED_IN',
      txn.aiConfidence || 0.5,
      txn.counterparty,
      0
    ]);
  }
}

async function getTransactions(filters = {}) {
  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];

  if (filters.category) {
    query += ' AND categoryCode = ?';
    params.push(filters.category);
  }

  if (filters.type) {
    query += ' AND type = ?';
    params.push(filters.type);
  }

  if (filters.dateFrom) {
    query += ' AND date >= ?';
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    query += ' AND date <= ?';
    params.push(filters.dateTo);
  }

  if (filters.search) {
    query += ' AND (description LIKE ? OR counterparty LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm);
  }

  query += ' ORDER BY date DESC';

  if (filters.limit) {
    query += ' LIMIT ? OFFSET ?';
    params.push(filters.limit, filters.offset || 0);
  }

  return await all(query, params);
}

async function updateTransaction(id, updates) {
  const fields = [];
  const params = [];

  if (updates.categoryCode) {
    fields.push('categoryCode = ?');
    params.push(updates.categoryCode);
  }

  if (updates.notes) {
    fields.push('notes = ?');
    params.push(updates.notes);
  }

  if (fields.length === 0) return null;

  fields.push('isManual = 1');
  params.push(id);

  await run(
    `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`,
    params
  );

  return await get('SELECT * FROM transactions WHERE id = ?', [id]);
}

async function getReportSummary(filters = {}) {
  let query = 'SELECT type, SUM(amount) as total, COUNT(*) as count FROM transactions WHERE 1=1';
  const params = [];

  if (filters.dateFrom) {
    query += ' AND date >= ?';
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    query += ' AND date <= ?';
    params.push(filters.dateTo);
  }

  query += ' GROUP BY type';

  const results = await all(query, params);

  const summary = {
    income: 0,
    expenses: 0,
    netCashFlow: 0
  };

  for (const row of results) {
    if (row.type === 'CREDIT') {
      summary.income = row.total;
    } else {
      summary.expenses = Math.abs(row.total);
    }
  }

  summary.netCashFlow = summary.income - summary.expenses;
  return summary;
}

async function getCategoryBreakdown(filters = {}) {
  let query = 'SELECT categoryCode, type, COUNT(*) as count, SUM(ABS(amount)) as total FROM transactions WHERE 1=1';
  const params = [];

  if (filters.dateFrom) {
    query += ' AND date >= ?';
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    query += ' AND date <= ?';
    params.push(filters.dateTo);
  }

  query += ' GROUP BY categoryCode, type ORDER BY total DESC';

  return await all(query, params);
}

async function getUploadHistory() {
  return await all('SELECT * FROM uploads ORDER BY createdAt DESC');
}

module.exports = {
  insertTransactions,
  getTransactions,
  updateTransaction,
  getReportSummary,
  getCategoryBreakdown,
  getUploadHistory
};



