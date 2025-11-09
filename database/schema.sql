CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  uploadId TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('CREDIT', 'DEBIT')),
  categoryCode TEXT NOT NULL,
  confidence REAL DEFAULT 0.5,
  reasoning TEXT,
  counterparty TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  fileName TEXT NOT NULL,
  transactionCount INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  code TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_el TEXT NOT NULL,
  type TEXT CHECK(type IN ('CREDIT', 'DEBIT'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(categoryCode);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_uploadId ON transactions(uploadId);

