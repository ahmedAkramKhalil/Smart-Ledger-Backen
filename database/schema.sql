-- ========================================
-- SMART LEDGER DATABASE SCHEMA v2.0
-- Complete Accounting System
-- ========================================

-- ========================================
-- CORE TABLES
-- ========================================

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  code TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_el TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('CREDIT', 'DEBIT')),
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  account_name TEXT NOT NULL,
  account_number TEXT,
  account_type TEXT DEFAULT 'checking' CHECK(account_type IN ('checking', 'savings', 'credit', 'cash')),
  currency TEXT DEFAULT 'EUR',
  opening_balance REAL DEFAULT 0,
  current_balance REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Uploads
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  account_id TEXT,
  transaction_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  analysis TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

-- ========================================
-- TRANSACTION TABLES
-- ========================================

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  uploadId TEXT NOT NULL,
  account_id TEXT,
  date TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('CREDIT', 'DEBIT')),
  categoryCode TEXT NOT NULL,
  confidence REAL DEFAULT 0.5,
  reasoning TEXT,
  counterparty TEXT,
  reference_number TEXT,
  reconciled INTEGER DEFAULT 0,
  ledger_entry_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (uploadId) REFERENCES uploads(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (categoryCode) REFERENCES categories(code) ON DELETE RESTRICT
);





-- Add reconciled column if missing


-- Verify columns were added
PRAGMA table_info(transactions);


-- Ledger Entries
CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  transaction_id TEXT,
  entry_date TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK(entry_type IN ('DEBIT', 'CREDIT')),
  amount REAL NOT NULL CHECK(amount > 0),
  running_balance REAL NOT NULL,
  description TEXT,
  reconciled INTEGER DEFAULT 0,
  reconciliation_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);

-- Account Balances History
CREATE TABLE IF NOT EXISTS account_balances_history (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  balance_date TEXT NOT NULL,
  opening_balance REAL NOT NULL,
  total_credits REAL DEFAULT 0,
  total_debits REAL DEFAULT 0,
  closing_balance REAL NOT NULL,
  transaction_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  UNIQUE(account_id, balance_date)
);

-- ========================================
-- INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_transactions_upload ON transactions(uploadId);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(categoryCode);
CREATE INDEX IF NOT EXISTS idx_transactions_reconciled ON transactions(reconciled);

CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_transaction ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_ledger_reconciled ON ledger_entries(reconciled);

CREATE INDEX IF NOT EXISTS idx_balance_account ON account_balances_history(account_id);
CREATE INDEX IF NOT EXISTS idx_balance_date ON account_balances_history(balance_date);

CREATE INDEX IF NOT EXISTS idx_uploads_account ON uploads(account_id);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);

-- ========================================
-- DEFAULT DATA
-- ========================================

-- Default Categories - CREDIT
INSERT OR IGNORE INTO categories (code, name_en, name_el, type) VALUES
  ('INVOICE_PAYMENT_FULL', 'Invoice Payment (Full)', 'Πληρωμή Τιμολογίου (Πλήρης)', 'CREDIT'),
  ('INVOICE_PAYMENT_PARTIAL', 'Invoice Payment (Partial)', 'Πληρωμή Τιμολογίου (Μερική)', 'CREDIT'),
  ('CAPITAL_RAISE', 'Capital Raise', 'Αύξηση Κεφαλαίου', 'CREDIT'),
  ('INTEREST_INCOME', 'Interest Income', 'Έσοδα από Τόκους', 'CREDIT'),
  ('EXPENSE_REFUND', 'Expense Refund', 'Επιστροφή Εξόδων', 'CREDIT'),
  ('LOAN_RECEIVED', 'Loan Received', 'Λήψη Δανείου', 'CREDIT'),
  ('INTERCOMPANY_IN', 'Intercompany Transfer In', 'Ενδοεταιρική Μεταφορά (Είσοδος)', 'CREDIT'),
  ('ATM_DEPOSIT', 'ATM Deposit', 'Κατάθεση ΑΤΜ', 'CREDIT'),
  ('UNCATEGORIZED_IN', 'Uncategorized Income', 'Μη Κατηγοριοποιημένο Έσοδο', 'CREDIT');

-- Default Categories - DEBIT
INSERT OR IGNORE INTO categories (code, name_en, name_el, type) VALUES
  ('SUPPLIER_PAYMENT', 'Supplier Payment', 'Πληρωμή Προμηθευτή', 'DEBIT'),
  ('LOAN_REPAYMENT', 'Loan Repayment', 'Αποπληρωμή Δανείου', 'DEBIT'),
  ('BANK_FEES', 'Bank Fees', 'Τραπεζικά Τέλη', 'DEBIT'),
  ('TAX_PAYMENT', 'Tax Payment', 'Καταβολή Φόρου', 'DEBIT'),
  ('PAYROLL', 'Payroll', 'Μισθοδοσία', 'DEBIT'),
  ('RENT', 'Rent Payment', 'Πληρωμή Ενοικίου', 'DEBIT'),
  ('UTILITIES', 'Utilities', 'Κοινόχρηστα', 'DEBIT'),
  ('ADMIN_EXPENSES', 'Admin Expenses', 'Διοικητικά Έξοδα', 'DEBIT'),
  ('ATM_WITHDRAWAL', 'ATM Withdrawal', 'Ανάληψη ΑΤΜ', 'DEBIT');

-- Default Account
INSERT OR IGNORE INTO accounts (id, account_name, account_number, account_type, currency, opening_balance, current_balance, is_active) 
VALUES ('acc_default_001', 'Main Business Account', 'GR0000000000000000000000', 'checking', 'EUR', 0, 0, 1);
