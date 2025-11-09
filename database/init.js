const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function initializeDatabase() {
  const dbDir = path.join(__dirname, '../data');
  const dbPath = path.join(dbDir, 'smartledger.db');

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log('🗄️ Initializing database at:', dbPath);
  
  // Remove old if exists
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // Read and execute schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  db.exec(schema);
  
  console.log('✅ Database initialized\n');
  return db;
}

module.exports = { initializeDatabase };
