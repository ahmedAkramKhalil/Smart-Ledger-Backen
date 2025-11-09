const { run, get, all } = require('../config/database');

const { v4: uuidv4 } = require('uuid');


const Database = require('better-sqlite3');
const path = require('path');

let db = null;

function getDatabase() {
  if (!db) {
    const dbPath = path.join(__dirname, '../../data/smartledger.db');
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
  }
  return db;
}

async function insertTransactions(transactions, uploadId) {
  try {
    console.log(`💾 Storing ${transactions.length} transactions...`);

    const db = getDatabase();

    const processedTransactions = transactions.map((txn) => ({
      id: uuidv4(),
      uploadId,
      date: txn.date || new Date().toISOString().split('T')[0],
      description: txn.description || '',
      amount: txn.amount || 0,
      type: txn.type || 'DEBIT',
      categoryCode: txn.categoryCode || 'UNCATEGORIZED_IN',
      confidence: txn.confidence || 0.5,
      reasoning: txn.reasoning || '',
      counterparty: txn.counterparty || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    const insertStmt = db.prepare(`
      INSERT INTO transactions (
        id, uploadId, date, description, amount, type, 
        categoryCode, confidence, reasoning, counterparty,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((txns) => {
      txns.forEach((txn) => {
        insertStmt.run(
          txn.id, txn.uploadId, txn.date, txn.description, txn.amount,
          txn.type, txn.categoryCode, txn.confidence, txn.reasoning,
          txn.counterparty, txn.createdAt, txn.updatedAt
        );
      });
    });

    insertMany(processedTransactions);
    console.log(`✅ Stored ${processedTransactions.length} transactions`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

async function getUploadHistory() {
  try {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM uploads ORDER BY createdAt DESC');
    return stmt.all();
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
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


module.exports = {
  insertTransactions,
  getTransactions,
  updateTransaction,
  getReportSummary,
  getCategoryBreakdown,
  getUploadHistory
};



