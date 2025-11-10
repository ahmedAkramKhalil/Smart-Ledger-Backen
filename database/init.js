const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function initializeDatabase() {
  const dbDir = path.join(__dirname, '../data');
  const dbPath = path.join(dbDir, 'smartledger.db');
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('📁 Created data directory');
  }

  console.log('🗄️ Initializing database at:', dbPath);

  // ✅ SAFE: Check if database already exists
  const dbExists = fs.existsSync(dbPath);
  
  if (dbExists) {
    console.log('📊 Database file exists - checking for data...');
  } else {
    console.log('📊 Creating new database file...');
  }

  // ❌ REMOVED THIS DANGEROUS CODE:
  // if (fs.existsSync(dbPath)) {
  //   fs.unlinkSync(dbPath);  // ← THIS WAS DELETING YOUR DATA!
  // }

  // Connect to database (creates if doesn't exist)
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // Check if tables already exist
  const tableCheck = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='transactions'
  `).get();

  if (tableCheck) {
    // Tables exist - count existing data
    const countResult = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
    console.log(`✅ Database loaded - Found ${countResult.count} existing transactions`);
    
    if (countResult.count > 0) {
      console.log('✅ Data preserved across restart!');
    } else {
      console.log('ℹ️  Database is empty - ready for data import');
    }
  } else {
    // Tables don't exist - create them
    console.log('📋 Creating database tables...');
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Schema file not found at:', schemaPath);
      throw new Error('schema.sql file missing');
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    
    console.log('✅ Database tables created');
  }

  console.log('✅ Database initialization complete\n');
  return db;
}

// Optional: Backup function for safety
function backupDatabase() {
  const dbPath = path.join(__dirname, '../data/smartledger.db');
  
  if (fs.existsSync(dbPath)) {
    const backupDir = path.join(__dirname, '../data/backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `smartledger-backup-${timestamp}.db`);
    
    fs.copyFileSync(dbPath, backupPath);
    console.log(`💾 Database backed up to: ${backupPath}`);
    
    // Keep only last 10 backups
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('smartledger-backup-'))
      .sort()
      .reverse();
    
    if (backups.length > 10) {
      backups.slice(10).forEach(oldBackup => {
        fs.unlinkSync(path.join(backupDir, oldBackup));
      });
    }
  }
}

module.exports = { initializeDatabase, backupDatabase };