const { getDatabase } = require('./transactionService');
const { v4: uuidv4 } = require('uuid');

// Create new account
async function createAccount(accountData) {
  try {
    const db = getDatabase();
    
    const account = {
      id: uuidv4(),
      account_name: accountData.account_name || accountData.name,
      account_number: accountData.account_number || '',
      account_type: accountData.account_type || 'checking',
      currency: accountData.currency || 'EUR',
      opening_balance: parseFloat(accountData.opening_balance) || 0,
      current_balance: parseFloat(accountData.opening_balance) || 0,
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const stmt = db.prepare(`
      INSERT INTO accounts (
        id, account_name, account_number, account_type, 
        currency, opening_balance, current_balance, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      account.id, account.account_name, account.account_number,
      account.account_type, account.currency, account.opening_balance,
      account.current_balance, account.is_active, 
      account.created_at, account.updated_at
    );

    console.log('✅ Account created:', account.id);
    return account;
  } catch (error) {
    console.error('❌ Error creating account:', error.message);
    throw error;
  }
}

// Get all accounts
async function getAllAccounts() {
  try {
    const db = getDatabase();
    const accounts = db.prepare('SELECT * FROM accounts WHERE is_active = 1 ORDER BY created_at DESC').all();
    console.log(`✅ Retrieved ${accounts.length} accounts`);
    return accounts;
  } catch (error) {
    console.error('❌ Error fetching accounts:', error.message);
    throw error;
  }
}

// Get account by ID
async function getAccountById(id) {
  try {
    const db = getDatabase();
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
    if (!account) {
      throw new Error('Account not found');
    }
    return account;
  } catch (error) {
    console.error('❌ Error fetching account:', error.message);
    throw error;
  }
}

// Update account
async function updateAccount(id, updateData) {
  try {
    const db = getDatabase();
    
    const updates = [];
    const values = [];

    if (updateData.account_name) {
      updates.push('account_name = ?');
      values.push(updateData.account_name);
    }
    
    if (updateData.account_type) {
      updates.push('account_type = ?');
      values.push(updateData.account_type);
    }
    
    if (updateData.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(updateData.is_active);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const query = `UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);

    console.log('✅ Account updated:', id);
    return await getAccountById(id);
  } catch (error) {
    console.error('❌ Error updating account:', error.message);
    throw error;
  }
}

// Update account balance
async function updateAccountBalance(accountId) {
  try {
    const db = getDatabase();
    
    const balance = db.prepare(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN entry_type = 'CREDIT' THEN amount 
          WHEN entry_type = 'DEBIT' THEN -amount 
        END
      ), 0) as current_balance
      FROM ledger_entries
      WHERE account_id = ?
    `).get(accountId);

    db.prepare(`
      UPDATE accounts 
      SET current_balance = ?, updated_at = ?
      WHERE id = ?
    `).run(
      balance.current_balance,
      new Date().toISOString(),
      accountId
    );

    console.log('✅ Account balance updated:', accountId, balance.current_balance);
    return balance.current_balance;
  } catch (error) {
    console.error('❌ Error updating balance:', error.message);
    throw error;
  }
}

// Get account balance
async function getAccountBalance(accountId) {
  try {
    const db = getDatabase();
    const account = await getAccountById(accountId);
    return {
      account_id: accountId,
      current_balance: account.current_balance,
      opening_balance: account.opening_balance,
      net_change: account.current_balance - account.opening_balance
    };
  } catch (error) {
    console.error('❌ Error getting balance:', error.message);
    throw error;
  }
}

module.exports = {
  createAccount,
  getAllAccounts,
  getAccountById,
  updateAccount,
  updateAccountBalance,
  getAccountBalance
};

