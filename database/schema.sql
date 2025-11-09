CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  uploadId TEXT,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('CREDIT', 'DEBIT')),
  categoryCode TEXT,
  aiConfidence REAL DEFAULT 0.5,
  counterparty TEXT,
  notes TEXT,
  isManual INTEGER DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  fileName TEXT NOT NULL,
  fileType TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  transactionCount INTEGER,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

